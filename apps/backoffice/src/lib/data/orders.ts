import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { getStoreSettings } from "@/lib/data/store-settings";
import {
  postgrestQuoted,
  sanitizePostgrestSearchTerm,
} from "@/lib/domain/order-search";
import {
  defaultResolvedOrderUi,
  getStatusListSortIndexResolved,
} from "@/lib/domain/order-ui-config";

export { sanitizeOrderSearchQ, sanitizePostgrestSearchTerm } from "@/lib/domain/order-search";

export type OrderListItem = {
  id: string;
  publicNo: string;
  status: string;
  orderType: string;
  customerName: string | null;
  customerPhone: string;
  deviceLabel: string;
  issue: string;
  /** Same as `repair_orders.quotation_amount` */
  quotationAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  isPaid: boolean;
  createdAt: string;
  /** Last row update — drives list secondary sort */
  updatedAt: string;
  technicianName: string | null;
  supplierId: string | null;
  supplierShortName: string | null;
  supplierColor: string | null;
  originalOrderId: string | null;
  /** From linked original order — used for rework warranty chips on list */
  originalOrderCompletedAt: string | null;
  originalOrderWarrantyText: string | null;
};

export type OrderListFilters = {
  q?: string;
  status?: string;
  orderType?: string;
  technician?: string;
  paid?: "all" | "yes" | "no";
  supplier?: string;
  approvalOverdue?: boolean;
  pickupOverdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

export type ListOrdersResult = {
  items: OrderListItem[];
  error?: string;
};

const REPAIR_ORDER_LIST_SELECT = `
      id,
      public_no,
      status,
      order_type,
      issue_description,
      quotation_amount,
      deposit_amount,
      balance_amount,
      is_paid,
      created_at,
      updated_at,
      approval_sent_at,
      completed_at,
      technician_name,
      supplier_id,
      original_order_id,
      customers:customer_id ( name, phone_e164 ),
      devices:device_id ( brand, model, serial_or_imei ),
      suppliers:supplier_id ( short_name, color )
    `;

/** PostgREST `.in('id', …)` URL 过长时分批 */
const ORDER_ID_IN_CHUNK = 100;

/** 搜索路径合并 ID 上限，防止极端宽泛关键字拖垮请求 */
const SEARCH_MATCH_MAX_IDS = 5000;

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

type RepairOrderListRow = {
  id: string;
  public_no: string;
  status: string;
  order_type: string;
  issue_description: string;
  quotation_amount: number | null;
  deposit_amount: number | null;
  balance_amount: number | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  technician_name: string | null;
  supplier_id: string | null;
  original_order_id: string | null;
  customers:
    | { name: string | null; phone_e164: string | null }
    | { name: string | null; phone_e164: string | null }[]
    | null;
  devices:
    | { brand: string; model: string; serial_or_imei: string | null }
    | { brand: string; model: string; serial_or_imei: string | null }[]
    | null;
  suppliers:
    | { short_name: string; color: string }
    | { short_name: string; color: string }[]
    | null;
};

/**
 * PostgREST 在同一段 `.or()` 中混用主表列与嵌入资源列（customers./devices.）会触发
 * `failed to parse logic tree`。此处拆成单表 `.or()` 再合并工单 id。
 */
async function collectOrderIdsMatchingSearch(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  storeId: string,
  qSafe: string,
): Promise<{ ids: string[]; error?: string }> {
  const like = `%${qSafe}%`;
  const qv = postgrestQuoted(like);
  const baseOr = [
    `public_no.ilike.${qv}`,
    `issue_description.ilike.${qv}`,
    `technician_name.ilike.${qv}`,
  ].join(",");
  const customerOr = [`name.ilike.${qv}`, `phone_e164.ilike.${qv}`].join(",");
  const deviceOr = [`brand.ilike.${qv}`, `model.ilike.${qv}`, `serial_or_imei.ilike.${qv}`].join(
    ",",
  );

  const [baseRes, custRes, devRes] = await Promise.all([
    supabase
      .from("repair_orders")
      .select("id")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .or(baseOr)
      .limit(SEARCH_MATCH_MAX_IDS),
    supabase
      .from("customers")
      .select("id")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .or(customerOr)
      .limit(2000),
    supabase
      .from("devices")
      .select("id")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .or(deviceOr)
      .limit(2000),
  ]);

  const firstErr = baseRes.error ?? custRes.error ?? devRes.error;
  if (firstErr) {
    return { ids: [], error: firstErr.message };
  }

  const ids = new Set<string>();
  for (const row of baseRes.data ?? []) ids.add(row.id);

  const customerIds = (custRes.data ?? []).map((r) => r.id);
  for (const part of chunkIds(customerIds, 150)) {
    const r = await supabase
      .from("repair_orders")
      .select("id")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .in("customer_id", part)
      .limit(SEARCH_MATCH_MAX_IDS);
    if (r.error) return { ids: [], error: r.error.message };
    for (const row of r.data ?? []) ids.add(row.id);
  }

  const deviceIds = (devRes.data ?? []).map((r) => r.id);
  for (const part of chunkIds(deviceIds, 150)) {
    const r = await supabase
      .from("repair_orders")
      .select("id")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .in("device_id", part)
      .limit(SEARCH_MATCH_MAX_IDS);
    if (r.error) return { ids: [], error: r.error.message };
    for (const row of r.data ?? []) ids.add(row.id);
  }

  return { ids: [...ids].slice(0, SEARCH_MATCH_MAX_IDS) };
}

export async function listOrders(filters: OrderListFilters = {}): Promise<ListOrdersResult> {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) {
    return { items: [] as OrderListItem[] };
  }

  const supabase = createSupabaseServerClient();
  const settings = await getStoreSettings();
  const approvalOverdueHours = settings?.approvalOverdueHours ?? 48;
  const pickupOverdueDays = settings?.pickupOverdueDays ?? 5;
  const resolvedUi = settings?.resolvedOrderUi ?? defaultResolvedOrderUi();

  const qSafe = filters.q ? sanitizePostgrestSearchTerm(filters.q) : "";
  let restrictIds: string[] | null = null;
  if (qSafe.length > 0) {
    const { ids, error } = await collectOrderIdsMatchingSearch(supabase, storeId, qSafe);
    if (error) {
      return { items: [], error };
    }
    if (ids.length === 0) {
      return { items: [] };
    }
    restrictIds = ids;
  }

  const chainFilteredListQuery = (idSubset: string[] | null) => {
    let q = supabase
      .from("repair_orders")
      .select(REPAIR_ORDER_LIST_SELECT)
      .eq("store_id", storeId)
      .is("deleted_at", null);

    if (idSubset !== null && idSubset.length > 0) {
      q = q.in("id", idSubset);
    }

    /** 风险筛选已限定 status，忽略 URL 中的 status，避免互斥条件导致 0 条 */
    const riskActive = Boolean(filters.approvalOverdue || filters.pickupOverdue);
    if (!riskActive && filters.status && filters.status !== "all") {
      q = q.eq("status", filters.status);
    }

    if (filters.orderType && filters.orderType !== "all") {
      q = q.eq("order_type", filters.orderType);
    }

    if (filters.technician && filters.technician !== "all") {
      q = q.eq("technician_name", filters.technician);
    }

    if (filters.paid === "yes") {
      q = q.eq("is_paid", true);
    } else if (filters.paid === "no") {
      q = q.eq("is_paid", false);
    }

    if (filters.supplier && filters.supplier !== "all") {
      q = q.eq("supplier_id", filters.supplier);
    }

    if (filters.dateFrom) {
      q = q.gte("created_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      q = q.lte("created_at", filters.dateTo);
    }

    if (filters.approvalOverdue) {
      const cutoff = new Date(Date.now() - approvalOverdueHours * 3600 * 1000).toISOString();
      q = q.eq("status", "waiting_approval").lte("approval_sent_at", cutoff);
    } else if (filters.pickupOverdue) {
      const cutoff = new Date(Date.now() - pickupOverdueDays * 24 * 3600 * 1000).toISOString();
      q = q.in("status", ["repaired", "notified", "unfixed_pickup"]).lte("completed_at", cutoff);
    }

    return q;
  };

  let rows: RepairOrderListRow[];

  if (restrictIds !== null && restrictIds.length > ORDER_ID_IN_CHUNK) {
    const parts = chunkIds(restrictIds, ORDER_ID_IN_CHUNK);
    const results = await Promise.all(parts.map((part) => chainFilteredListQuery(part).limit(5000)));
    const bad = results.find((r) => r.error);
    if (bad?.error) {
      return { items: [], error: bad.error.message || "工单列表查询失败" };
    }
    const merged = new Map<string, RepairOrderListRow>();
    for (const r of results) {
      for (const row of r.data ?? []) merged.set(row.id, row as RepairOrderListRow);
    }
    rows = [...merged.values()];
  } else {
    const res = await chainFilteredListQuery(restrictIds).limit(5000);
    if (res.error) {
      return {
        items: [],
        error: res.error.message || "工单列表查询失败",
      };
    }
    rows = (res.data ?? []) as RepairOrderListRow[];
  }

  const originalIds = [
    ...new Set(
      rows
        .map((r) => r.original_order_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const originalMeta = new Map<string, { completed_at: string | null; warranty_text: string | null }>();
  if (originalIds.length > 0) {
    const origRes = await supabase
      .from("repair_orders")
      .select("id, completed_at, warranty_text")
      .eq("store_id", storeId)
      .in("id", originalIds)
      .is("deleted_at", null);
    if (!origRes.error && origRes.data) {
      for (const o of origRes.data) {
        originalMeta.set(o.id, {
          completed_at: o.completed_at,
          warranty_text: o.warranty_text,
        });
      }
    }
  }

  const items: OrderListItem[] = rows.map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const device = Array.isArray(row.devices) ? row.devices[0] : row.devices;
    const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers;

    const brand = device?.brand ?? "";
    const model = device?.model ?? "";
    const deviceLabel = [brand, model].filter(Boolean).join(" ");
    const oid = row.original_order_id ?? null;
    const orig = oid ? originalMeta.get(oid) : undefined;

    return {
      id: row.id,
      publicNo: row.public_no,
      status: row.status,
      orderType: row.order_type,
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone_e164 ?? "",
      deviceLabel,
      issue: row.issue_description,
      quotationAmount: row.quotation_amount ?? null,
      depositAmount: row.deposit_amount ?? null,
      balanceAmount: row.balance_amount ?? null,
      isPaid: row.is_paid ?? false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      technicianName: row.technician_name ?? null,
      supplierId: row.supplier_id ?? null,
      supplierShortName: supplier?.short_name ?? null,
      supplierColor: supplier?.color ?? null,
      originalOrderId: oid ?? null,
      originalOrderCompletedAt: orig?.completed_at ?? null,
      originalOrderWarrantyText: orig?.warranty_text ?? null,
    };
  });

  items.sort((a, b) => {
    const rankDiff =
      getStatusListSortIndexResolved(a.status, resolvedUi) -
      getStatusListSortIndexResolved(b.status, resolvedUi);
    if (rankDiff !== 0) return rankDiff;
    const tu = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (tu !== 0) return tu;
    return b.id.localeCompare(a.id);
  });

  return { items };
}
