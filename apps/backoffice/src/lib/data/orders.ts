import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { getStoreSettings } from "@/lib/data/store-settings";
import {
  defaultResolvedOrderUi,
  getStatusListSortIndexResolved,
} from "@/lib/domain/order-ui-config";

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

const ORDER_SEARCH_Q_MAX_LEN = 200;

/** Safe fragment for PostgREST `.or(...)` ilike patterns: drop chars that break filters or LIKE wildcards. */
export function sanitizeOrderSearchQ(raw: string): string {
  return raw
    .trim()
    .slice(0, ORDER_SEARCH_Q_MAX_LEN)
    .replace(/\\/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/_/g, "");
}

/** PostgREST filter value: quote so `.` and other chars in search text do not break `col.op.value` parsing. */
function postgrestQuoted(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export type ListOrdersResult = {
  items: OrderListItem[];
  error?: string;
};

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

  let query = supabase
    .from("repair_orders")
    .select(
      `
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
    `,
    )
    .eq("store_id", storeId)
    .is("deleted_at", null);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.orderType && filters.orderType !== "all") {
    query = query.eq("order_type", filters.orderType);
  }

  if (filters.technician && filters.technician !== "all") {
    query = query.eq("technician_name", filters.technician);
  }

  if (filters.paid === "yes") {
    query = query.eq("is_paid", true);
  } else if (filters.paid === "no") {
    query = query.eq("is_paid", false);
  }

  if (filters.supplier && filters.supplier !== "all") {
    query = query.eq("supplier_id", filters.supplier);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  if (filters.approvalOverdue) {
    const cutoff = new Date(Date.now() - approvalOverdueHours * 3600 * 1000).toISOString();
    query = query.eq("status", "waiting_approval").lte("approval_sent_at", cutoff);
  }

  if (filters.pickupOverdue) {
    const cutoff = new Date(Date.now() - pickupOverdueDays * 24 * 3600 * 1000).toISOString();
    // Unified flow: pickup-facing statuses are repaired / notified (legacy waiting_pickup migrated).
    query = query.in("status", ["repaired", "notified", "unfixed_pickup"]).lte("completed_at", cutoff);
  }

  const qSafe = filters.q ? sanitizeOrderSearchQ(filters.q) : "";
  if (qSafe.length > 0) {
    const like = `%${qSafe}%`;
    const qv = postgrestQuoted(like);
    query = query.or(
      [
        `public_no.ilike.${qv}`,
        `issue_description.ilike.${qv}`,
        `technician_name.ilike.${qv}`,
        `customers.name.ilike.${qv}`,
        `customers.phone_e164.ilike.${qv}`,
        `devices.brand.ilike.${qv}`,
        `devices.model.ilike.${qv}`,
        `devices.serial_or_imei.ilike.${qv}`,
      ].join(","),
    );
  }

  const res = await query.limit(5000);

  if (res.error) {
    return {
      items: [],
      error: res.error.message || "工单列表查询失败",
    };
  }

  const rows = res.data ?? [];
  const originalIds = [
    ...new Set(
      rows
        .map((r) => (r as { original_order_id?: string | null }).original_order_id)
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
    const oid = (row as Record<string, unknown>).original_order_id as string | null | undefined;
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
