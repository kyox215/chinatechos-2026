import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

export type OrderListItem = {
  id: string;
  publicNo: string;
  status: string;
  orderType: string;
  customerName: string | null;
  customerPhone: string;
  deviceLabel: string;
  issue: string;
  total: number | null;
  isPaid: boolean;
  createdAt: string;
  technicianName: string | null;
};

export type OrderListFilters = {
  q?: string;
  status?: string;
  orderType?: string;
  technician?: string;
  paid?: "all" | "yes" | "no";
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
      is_paid,
      created_at,
      approval_sent_at,
      completed_at,
      technician_name,
      customers:customer_id ( name, phone_e164 ),
      devices:device_id ( brand, model, serial_or_imei )
    `,
    )
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

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

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  if (filters.approvalOverdue) {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    query = query.eq("status", "waiting_approval").lte("approval_sent_at", cutoff);
  }

  if (filters.pickupOverdue) {
    const cutoff = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
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

  const res = await query.limit(50);

  if (res.error) {
    throw new Error(res.error.message);
  }

  const items: OrderListItem[] = (res.data ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const device = Array.isArray(row.devices) ? row.devices[0] : row.devices;

    const brand = device?.brand ?? "";
    const model = device?.model ?? "";
    const deviceLabel = [brand, model].filter(Boolean).join(" ");

    return {
      id: row.id,
      publicNo: row.public_no,
      status: row.status,
      orderType: row.order_type,
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone_e164 ?? "",
      deviceLabel,
      issue: row.issue_description,
      total: row.quotation_amount ?? null,
      isPaid: row.is_paid ?? false,
      createdAt: row.created_at,
      technicianName: row.technician_name ?? null,
    };
  });

  return { items };
}
