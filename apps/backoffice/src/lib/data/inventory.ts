import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { generateInventoryPublicNo } from "@/lib/domain/inventory-public-no";
import { appendInventoryEvent } from "@/lib/data/inventory-events";
import {
  buildInventoryCreatedPayload,
  buildInventoryStatusChangedPayload,
} from "@/lib/domain/inventory-linkage-payload";
import { canSellInventory } from "@/lib/inventory/sellable";
import { isUuid, normalizeScanInput, tryExtractUrlLastSegment } from "@/lib/inventory/scan-parse";

export type ProductChannel = "new_retail" | "refurbished" | "trade_in";
export type InventoryLifecycle = "draft" | "in_stock" | "reserved" | "sold" | "cancelled";

export type InventoryItemRow = {
  id: string;
  store_id: string;
  public_no: string;
  product_channel: ProductChannel;
  lifecycle_status: InventoryLifecycle;
  brand: string;
  model: string;
  imei_or_serial: string | null;
  purchase_cost: number | null;
  list_price: number | null;
  sold_price: number | null;
  seller_customer_id: string | null;
  buyer_customer_id: string | null;
  source_repair_order_id: string | null;
  qa_report: Record<string, unknown>;
  qa_completed_at: string | null;
  listing_hold_until: string | null;
  imei_check_done: boolean;
  imei_check_note: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/[^+\d]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("39")) return `+${digits}`;
  return `+39${digits}`;
}

export class InventoryImeiConflictError extends Error {
  readonly existingId: string;
  readonly existingPublicNo: string;

  constructor(existingId: string, existingPublicNo: string) {
    super(`IMEI/序列号已在库：${existingPublicNo}`);
    this.name = "InventoryImeiConflictError";
    this.existingId = existingId;
    this.existingPublicNo = existingPublicNo;
  }
}

function addHoldDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

const DEFAULT_TRADE_IN_HOLD_DAYS = 7;

export async function resolveTradeInHoldDaysForStore(storeId: string): Promise<number> {
  const raw = env.tradeInHoldDays?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 365) return Math.floor(n);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stores")
    .select("order_ui_config")
    .eq("id", storeId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const cfg = data?.order_ui_config as Record<string, unknown> | null | undefined;
  const inv = cfg?.inventory as Record<string, unknown> | undefined;
  const d = inv?.trade_in_hold_days;
  if (typeof d === "number" && Number.isFinite(d) && d >= 0 && d <= 365) {
    return Math.floor(d);
  }

  return DEFAULT_TRADE_IN_HOLD_DAYS;
}

export function normalizeIdempotencyKey(raw: string | null | undefined): string | null {
  const k = raw?.trim() ?? "";
  if (!k) return null;
  if (k.length > 128) return null;
  return k;
}

export async function findInventoryByIdempotencyKey(
  idempotencyKey: string,
): Promise<{ id: string; publicNo: string } | null> {
  const storeId = await resolveStoreId();
  if (!storeId) return null;

  const supabase = createSupabaseServerClient();
  const { data: mapRow, error } = await supabase
    .from("inventory_create_idempotency")
    .select("inventory_item_id")
    .eq("store_id", storeId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const itemId = mapRow?.inventory_item_id as string | undefined;
  if (!itemId) return null;

  const item = await getInventoryItem(itemId);
  if (!item) return null;
  return { id: item.id, publicNo: item.public_no };
}

export async function registerInventoryIdempotencyAfterCreate(input: {
  idempotencyKey: string;
  newItemId: string;
  publicNo: string;
}): Promise<{ outcome: "registered" | "replayed"; id: string; publicNo: string }> {
  const storeId = await resolveStoreId();
  if (!storeId) throw new Error("无法确定门店");

  const supabase = createSupabaseServerClient();
  const ins = await supabase.from("inventory_create_idempotency").insert({
    store_id: storeId,
    idempotency_key: input.idempotencyKey,
    inventory_item_id: input.newItemId,
  });

  if (!ins.error) {
    return { outcome: "registered", id: input.newItemId, publicNo: input.publicNo };
  }

  const msg = ins.error.message ?? "";
  const pgCode = (ins.error as { code?: string }).code;
  const isDup =
    pgCode === "23505" ||
    msg.includes("duplicate key") ||
    msg.includes("inventory_create_idempotency_pkey");

  if (!isDup) throw new Error(ins.error.message);

  const { data: existingMap, error: mapErr } = await supabase
    .from("inventory_create_idempotency")
    .select("inventory_item_id")
    .eq("store_id", storeId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (mapErr) throw new Error(mapErr.message);
  const winnerId = existingMap?.inventory_item_id as string | undefined;
  if (!winnerId) throw new Error("幂等映射读取失败");

  if (winnerId === input.newItemId) {
    return { outcome: "registered", id: input.newItemId, publicNo: input.publicNo };
  }

  const del = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", input.newItemId)
    .eq("store_id", storeId);

  if (del.error) throw new Error(del.error.message);

  const winner = await getInventoryItem(winnerId);
  if (!winner) throw new Error("幂等目标记录不存在");
  return { outcome: "replayed", id: winner.id, publicNo: winner.public_no };
}

function normalizeInventoryRow(row: Record<string, unknown>): InventoryItemRow {
  const qa = row.qa_report;
  const qa_report =
    qa != null && typeof qa === "object" && !Array.isArray(qa)
      ? (qa as Record<string, unknown>)
      : {};
  return { ...row, qa_report } as InventoryItemRow;
}

export async function listInventoryItems(opts: {
  q?: string;
  channel?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<{ items: InventoryItemRow[]; error?: string }> {
  try {
    const storeId = await resolveStoreId();
    if (!storeId) return { items: [] };

    const supabase = createSupabaseServerClient();
    let q = supabase
      .from("inventory_items")
      .select("*")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 200);

    if (opts.channel && opts.channel !== "all") {
      q = q.eq("product_channel", opts.channel);
    }
    if (opts.status && opts.status !== "all") {
      q = q.eq("lifecycle_status", opts.status);
    }
    if (opts.dateFrom?.trim()) {
      q = q.gte("created_at", `${opts.dateFrom.trim()}T00:00:00.000Z`);
    }
    if (opts.dateTo?.trim()) {
      q = q.lte("created_at", `${opts.dateTo.trim()}T23:59:59.999Z`);
    }

    const { data, error } = await q;
    if (error) return { items: [], error: error.message };

    let rows = (data ?? []).map((r) => normalizeInventoryRow(r as Record<string, unknown>));
    const needle = opts.q?.trim().toLowerCase();
    if (needle) {
      rows = rows.filter((r) => {
        const hay = [
          r.public_no,
          r.brand,
          r.model,
          r.imei_or_serial ?? "",
          r.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    return { items: rows };
  } catch (e) {
    const message = e instanceof Error ? e.message : "加载失败";
    return { items: [], error: message };
  }
}

/** Active inventory = not sold/cancelled (same rule as IMEI duplicate check). */
const ACTIVE_STATUSES: InventoryLifecycle[] = ["draft", "in_stock", "reserved"];

async function findDuplicateActiveImei(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  storeId: string,
  imei: string,
): Promise<{ id: string; public_no: string } | null> {
  const { data } = await supabase
    .from("inventory_items")
    .select("id, public_no")
    .eq("store_id", storeId)
    .eq("imei_or_serial", imei)
    .is("deleted_at", null)
    .in("lifecycle_status", ACTIVE_STATUSES)
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  return { id: data.id as string, public_no: data.public_no as string };
}

/**
 * Resolve scanner / pasted text to a single inventory id or fall back to list search.
 */
export async function lookupInventoryScan(raw: string): Promise<
  { match: "direct"; id: string } | { match: "search"; q: string }
> {
  const trimmed = normalizeScanInput(raw);
  if (!trimmed) return { match: "search", q: "" };

  let candidate = trimmed;
  if (!isUuid(candidate)) {
    const seg = tryExtractUrlLastSegment(trimmed);
    if (seg && isUuid(seg)) candidate = seg;
  }

  const storeId = await resolveStoreId();
  if (!storeId) return { match: "search", q: trimmed };

  const supabase = createSupabaseServerClient();

  if (isUuid(candidate)) {
    const { data } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("store_id", storeId)
      .eq("id", candidate)
      .is("deleted_at", null)
      .maybeSingle();
    if (data?.id) return { match: "direct", id: data.id as string };
  }

  const { data: byNo } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("store_id", storeId)
    .eq("public_no", trimmed)
    .is("deleted_at", null)
    .maybeSingle();
  if (byNo?.id) return { match: "direct", id: byNo.id as string };

  const { data: byImei } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("store_id", storeId)
    .eq("imei_or_serial", trimmed)
    .is("deleted_at", null)
    .limit(2);
  if (byImei && byImei.length === 1) {
    return { match: "direct", id: byImei[0].id as string };
  }

  return { match: "search", q: trimmed };
}

export async function listInventoryItemsForExport(opts: {
  q?: string;
  channel?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<InventoryItemRow[]> {
  const storeId = await resolveStoreId();
  if (!storeId) return [];

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("inventory_items")
    .select("*")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (opts.channel && opts.channel !== "all") {
    query = query.eq("product_channel", opts.channel);
  }
  if (opts.status && opts.status !== "all") {
    query = query.eq("lifecycle_status", opts.status);
  }
  if (opts.dateFrom?.trim()) {
    query = query.gte("created_at", `${opts.dateFrom.trim()}T00:00:00.000Z`);
  }
  if (opts.dateTo?.trim()) {
    query = query.lte("created_at", `${opts.dateTo.trim()}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []).map((r) => normalizeInventoryRow(r as Record<string, unknown>));
  const needle = opts.q?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((r) => {
      const hay = [
        r.public_no,
        r.brand,
        r.model,
        r.imei_or_serial ?? "",
        r.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  return rows;
}

export async function getInventoryItem(id: string): Promise<InventoryItemRow | null> {
  const storeId = await resolveStoreId();
  if (!storeId) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeInventoryRow(data as Record<string, unknown>);
}

export type CreateInventoryInput = {
  productChannel: ProductChannel;
  brand: string;
  model: string;
  imeiOrSerial?: string;
  sellerPhone?: string;
  sellerName?: string;
  purchaseCost?: number;
  listPrice?: number;
  notes?: string;
  sourceRepairOrderId?: string;
};

async function deleteNewlyInsertedCustomerIfUnused(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  storeId: string,
  customerId: string | null,
): Promise<void> {
  if (!customerId) return;
  await supabase.from("customers").delete().eq("id", customerId).eq("store_id", storeId);
}

export async function createInventoryItem(input: CreateInventoryInput): Promise<{ id: string; publicNo: string }> {
  const storeId = await resolveStoreId();
  if (!storeId) throw new Error("无法确定门店");

  const supabase = createSupabaseServerClient();
  const store = await supabase.from("stores").select("store_code").eq("id", storeId).single();
  if (store.error || !store.data?.store_code) throw new Error("读取门店失败");

  const publicNo = await generateInventoryPublicNo(store.data.store_code);

  const imei = input.imeiOrSerial?.trim();
  if (imei) {
    const dup = await findDuplicateActiveImei(supabase, storeId, imei);
    if (dup) {
      throw new InventoryImeiConflictError(dup.id, dup.public_no);
    }
  }

  let sellerCustomerId: string | null = null;
  /** Set only when we insert a new customer row in this request — rolled back if inventory insert fails. */
  let newlyInsertedSellerId: string | null = null;

  if (input.productChannel === "trade_in") {
    const phone = input.sellerPhone?.trim();
    if (!phone) throw new Error("回收业务需要填写卖方电话");
    const phoneE164 = normalizePhoneE164(phone);
    const existing = await supabase
      .from("customers")
      .select("id")
      .eq("store_id", storeId)
      .eq("phone_e164", phoneE164)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing.data?.id) {
      sellerCustomerId = existing.data.id;
    } else {
      const ins = await supabase
        .from("customers")
        .insert({
          store_id: storeId,
          name: input.sellerName?.trim() || null,
          phone_raw: phone,
          phone_e164: phoneE164,
        })
        .select("id")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      sellerCustomerId = ins.data!.id;
      newlyInsertedSellerId = sellerCustomerId;
    }
  }

  const now = new Date();
  const holdDays =
    input.productChannel === "trade_in" ? await resolveTradeInHoldDaysForStore(storeId) : 0;
  const listingHoldUntil =
    input.productChannel === "trade_in" ? addHoldDays(now, holdDays).toISOString() : null;

  const row = {
    store_id: storeId,
    public_no: publicNo,
    product_channel: input.productChannel,
    lifecycle_status: "in_stock" as const,
    brand: input.brand.trim(),
    model: input.model.trim(),
    imei_or_serial: imei || null,
    purchase_cost: input.purchaseCost ?? null,
    list_price: input.listPrice ?? null,
    seller_customer_id: sellerCustomerId,
    source_repair_order_id: input.sourceRepairOrderId ?? null,
    listing_hold_until: listingHoldUntil,
    notes: input.notes?.trim() || null,
    updated_at: now.toISOString(),
  };

  const ins = await supabase.from("inventory_items").insert(row).select("id").single();
  if (ins.error) {
    await deleteNewlyInsertedCustomerIfUnused(supabase, storeId, newlyInsertedSellerId);
    throw new Error(ins.error.message);
  }

  const id = ins.data!.id as string;
  await appendInventoryEvent({
    inventoryItemId: id,
    eventType: "created",
    payload: buildInventoryCreatedPayload({
      storeId,
      inventoryItemId: id,
      publicNo,
      productChannel: input.productChannel,
      sellerCustomerId,
    }),
    operatorName: null,
  });

  return { id, publicNo };
}

export type PatchInventoryInput = {
  imeiCheckDone?: boolean;
  imeiCheckNote?: string | null;
  qaReport?: Record<string, unknown>;
  qaCompletedAt?: string | null;
  notes?: string | null;
  listPrice?: number | null;
  purchaseCost?: number | null;
};

export async function patchInventoryItem(id: string, patch: PatchInventoryInput): Promise<void> {
  const row = await getInventoryItem(id);
  if (!row) throw new Error("记录不存在");

  const supabase = createSupabaseServerClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.imeiCheckDone !== undefined) body.imei_check_done = patch.imeiCheckDone;
  if (patch.imeiCheckNote !== undefined) body.imei_check_note = patch.imeiCheckNote;
  if (patch.qaReport !== undefined) body.qa_report = patch.qaReport;
  if (patch.qaCompletedAt !== undefined) body.qa_completed_at = patch.qaCompletedAt;
  if (patch.notes !== undefined) body.notes = patch.notes;
  if (patch.listPrice !== undefined) body.list_price = patch.listPrice;
  if (patch.purchaseCost !== undefined) body.purchase_cost = patch.purchaseCost;

  const { error } = await supabase.from("inventory_items").update(body).eq("id", id);
  if (error) throw new Error(error.message);

  if (patch.qaReport !== undefined || patch.qaCompletedAt !== undefined) {
    await appendInventoryEvent({
      inventoryItemId: id,
      eventType: "qa_saved",
      payload: { has_report: Boolean(patch.qaReport), qa_completed_at: patch.qaCompletedAt ?? null },
      operatorName: null,
    });
  }
  if (patch.imeiCheckDone !== undefined) {
    await appendInventoryEvent({
      inventoryItemId: id,
      eventType: "imei_check_updated",
      payload: { imei_check_done: patch.imeiCheckDone },
      operatorName: null,
    });
  }
}

export async function listInventoryEvents(inventoryItemId: string) {
  const storeId = await resolveStoreId();
  if (!storeId) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_events")
    .select("*")
    .eq("store_id", storeId)
    .eq("inventory_item_id", inventoryItemId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function transitionInventoryItem(
  id: string,
  to: "reserved" | "sold" | "cancelled",
  opts?: { buyerPhone?: string; buyerName?: string; soldPrice?: number },
): Promise<void> {
  const row = await getInventoryItem(id);
  if (!row) throw new Error("记录不存在");

  if (to === "reserved" || to === "sold") {
    if (!canSellInventory(row)) {
      throw new Error(
        "当前不可转为预留/售出：请确认冷冻期已过，且回收机已完成 IMEI 对照与质检。",
      );
    }
  }

  const supabase = createSupabaseServerClient();
  const storeId = await resolveStoreId();
  if (!storeId) throw new Error("无法确定门店");

  let buyerCustomerId: string | null = row.buyer_customer_id;
  let newlyInsertedBuyerId: string | null = null;

  if (to === "sold" && opts?.buyerPhone?.trim()) {
    const phoneE164 = normalizePhoneE164(opts.buyerPhone.trim());
    const existing = await supabase
      .from("customers")
      .select("id")
      .eq("store_id", storeId)
      .eq("phone_e164", phoneE164)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing.data?.id) {
      buyerCustomerId = existing.data.id;
    } else {
      const ins = await supabase
        .from("customers")
        .insert({
          store_id: storeId,
          name: opts.buyerName?.trim() || null,
          phone_raw: opts.buyerPhone.trim(),
          phone_e164: phoneE164,
        })
        .select("id")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      buyerCustomerId = ins.data!.id;
      newlyInsertedBuyerId = buyerCustomerId;
    }
  }

  const body: Record<string, unknown> = {
    lifecycle_status: to,
    updated_at: new Date().toISOString(),
  };
  if (to === "sold") {
    body.buyer_customer_id = buyerCustomerId;
    if (opts?.soldPrice !== undefined) body.sold_price = opts.soldPrice;
  }

  const { error } = await supabase.from("inventory_items").update(body).eq("id", id);
  if (error) {
    await deleteNewlyInsertedCustomerIfUnused(supabase, storeId, newlyInsertedBuyerId);
    throw new Error(error.message);
  }

  await appendInventoryEvent({
    inventoryItemId: id,
    eventType: "status_changed",
    payload: buildInventoryStatusChangedPayload({
      storeId,
      inventoryItemId: id,
      from: row.lifecycle_status,
      to,
      buyerCustomerId: to === "sold" ? buyerCustomerId : null,
      soldPrice: to === "sold" ? opts?.soldPrice ?? null : null,
    }),
    operatorName: null,
  });
}
