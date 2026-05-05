import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";

export type OrderListItem = {
  id: string;
  publicNo: string;
  status: string;
  customerName: string | null;
  customerPhone: string;
  deviceLabel: string;
  issue: string;
  total: number | null;
  technicianName: string | null;
};

export async function listOrders() {
  if (!env.supabaseUrl || !env.supabaseAnonKey || !env.defaultStoreId) {
    return { items: [] as OrderListItem[] };
  }

  const supabase = createSupabaseServerClient();

  const res = await supabase
    .from("repair_orders")
    .select(
      `
      id,
      public_no,
      status,
      issue_description,
      quotation_amount,
      technician_name,
      customers:customer_id ( name, phone_e164 ),
      devices:device_id ( brand, model )
    `,
    )
    .eq("store_id", env.defaultStoreId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

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
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone_e164 ?? "",
      deviceLabel,
      issue: row.issue_description,
      total: row.quotation_amount ?? null,
      technicianName: row.technician_name ?? null,
    };
  });

  return { items };
}
