import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { getStoreSettings } from "@/lib/data/store-settings";

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

export async function listOrders(filters: OrderListFilters = {}) {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) {
    return { items: [] as OrderListItem[] };
  }

  const supabase = createSupabaseServerClient();
  const settings = await getStoreSettings();
  const approvalOverdueHours = settings?.approvalOverdueHours ?? 48;
  const pickupOverdueDays = settings?.pickupOverdueDays ?? 5;

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
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

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
    query = query.eq("status", "waiting_pickup").lte("completed_at", cutoff);
  }

  if (filters.q) {
    const escaped = filters.q.replace(/[,%]/g, "");
    const like = `%${escaped}%`;
    query = query.or(
      [
        `public_no.ilike.${like}`,
        `issue_description.ilike.${like}`,
        `technician_name.ilike.${like}`,
        `customers.name.ilike.${like}`,
        `customers.phone_e164.ilike.${like}`,
        `devices.brand.ilike.${like}`,
        `devices.model.ilike.${like}`,
        `devices.serial_or_imei.ilike.${like}`,
      ].join(","),
    );
  }

  const res = await query.limit(5000);

  if (res.error) {
    throw new Error(res.error.message);
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
      technicianName: row.technician_name ?? null,
      supplierId: row.supplier_id ?? null,
      supplierShortName: supplier?.short_name ?? null,
      supplierColor: supplier?.color ?? null,
      originalOrderId: oid ?? null,
      originalOrderCompletedAt: orig?.completed_at ?? null,
      originalOrderWarrantyText: orig?.warranty_text ?? null,
    };
  });

  return { items };
}
