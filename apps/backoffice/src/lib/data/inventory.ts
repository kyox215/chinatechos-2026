import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { generateInventoryPublicNo } from "@/lib/domain/inventory-public-no";
import { appendInventoryEvent } from "@/lib/data/inventory-events";
import { canSellInventory } from "@/lib/inventory/sellable";

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

const TRADE_IN_HOLD_DAYS = 7;

function addHoldDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export async function listInventoryItems(opts: {
  q?: string;
  channel?: string;
  status?: string;
  limit?: number;
}): Promise<{ items: InventoryItemRow[] }> {
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

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as InventoryItemRow[];
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
  return data as InventoryItemRow | null;
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

export async function createInventoryItem(input: CreateInventoryInput): Promise<{ id: string; publicNo: string }> {
  const storeId = await resolveStoreId();
  if (!storeId) throw new Error("无法确定门店");

  const supabase = createSupabaseServerClient();
  const store = await supabase.from("stores").select("store_code").eq("id", storeId).single();
  if (store.error || !store.data?.store_code) throw new Error("读取门店失败");

  const publicNo = await generateInventoryPublicNo(store.data.store_code);

  let sellerCustomerId: string | null = null;
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
    }
  }

  const now = new Date();
  const listingHoldUntil =
    input.productChannel === "trade_in" ? addHoldDays(now, TRADE_IN_HOLD_DAYS).toISOString() : null;

  const row = {
    store_id: storeId,
    public_no: publicNo,
    product_channel: input.productChannel,
    lifecycle_status: "in_stock" as const,
    brand: input.brand.trim(),
    model: input.model.trim(),
    imei_or_serial: input.imeiOrSerial?.trim() || null,
    purchase_cost: input.purchaseCost ?? null,
    list_price: input.listPrice ?? null,
    seller_customer_id: sellerCustomerId,
    source_repair_order_id: input.sourceRepairOrderId ?? null,
    listing_hold_until: listingHoldUntil,
    notes: input.notes?.trim() || null,
    updated_at: now.toISOString(),
  };

  const ins = await supabase.from("inventory_items").insert(row).select("id").single();
  if (ins.error) throw new Error(ins.error.message);

  const id = ins.data!.id as string;
  await appendInventoryEvent({
    inventoryItemId: id,
    eventType: "created",
    payload: { public_no: publicNo, product_channel: input.productChannel },
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
  if (error) throw new Error(error.message);

  await appendInventoryEvent({
    inventoryItemId: id,
    eventType: "status_changed",
    payload: { from: row.lifecycle_status, to },
    operatorName: null,
  });
}
