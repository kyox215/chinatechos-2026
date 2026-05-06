import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

export type CustomerDetail = {
  id: string;
  name: string | null;
  phoneE164: string;
  phoneRaw: string | null;
  consentRequiredNotify: boolean;
  consentMarketing: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerDevice = {
  id: string;
  brand: string;
  model: string;
  serialOrImei: string | null;
  createdAt: string;
};

export type CustomerOrder = {
  id: string;
  publicNo: string;
  orderType: string;
  status: string;
  issueDescription: string;
  quotationAmount: number | null;
  isPaid: boolean;
  technicianName: string | null;
  createdAt: string;
  deviceBrand: string | null;
  deviceModel: string | null;
};

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone_e164, phone_raw, consent_required_notify, consent_marketing, notes, created_at, updated_at")
    .eq("id", id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    phoneE164: data.phone_e164,
    phoneRaw: data.phone_raw,
    consentRequiredNotify: data.consent_required_notify ?? true,
    consentMarketing: data.consent_marketing ?? false,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getCustomerDevices(customerId: string): Promise<CustomerDevice[]> {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("devices")
    .select("id, brand, model, serial_or_imei, created_at")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    brand: d.brand,
    model: d.model,
    serialOrImei: d.serial_or_imei,
    createdAt: d.created_at,
  }));
}

export async function getCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("repair_orders")
    .select(`
      id, public_no, order_type, status, issue_description,
      quotation_amount, is_paid, technician_name, created_at,
      devices:device_id ( brand, model )
    `)
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((o) => {
    const device = Array.isArray(o.devices) ? o.devices[0] : o.devices;
    return {
      id: o.id,
      publicNo: o.public_no,
      orderType: o.order_type,
      status: o.status,
      issueDescription: o.issue_description,
      quotationAmount: o.quotation_amount,
      isPaid: o.is_paid ?? false,
      technicianName: o.technician_name,
      createdAt: o.created_at,
      deviceBrand: device?.brand ?? null,
      deviceModel: device?.model ?? null,
    };
  });
}
