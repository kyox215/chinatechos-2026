import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

export type OrderDetail = {
  id: string;
  publicNo: string;
  orderType: string;
  status: string;
  issueDescription: string;
  diagnosisResult: string | null;
  quotationAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  isPaid: boolean;
  approvalStatus: string;
  approvalSentAt: string | null;
  approvalConfirmedAt: string | null;
  technicianName: string | null;
  internalTag: string | null;
  warrantyText: string | null;
  pauseReason: string | null;
  cancelReason: string | null;
  customerSignature: string | null;
  contactPhones: string[];
  completedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string | null;
    phoneE164: string;
    phoneRaw: string | null;
  } | null;
  device: {
    id: string;
    brand: string;
    model: string;
    serialOrImei: string | null;
  } | null;
  supplier: {
    id: string;
    name: string;
    shortName: string;
    color: string;
  } | null;
};

export type OrderEvent = {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  operatorName: string | null;
  createdAt: string;
};

const ORDER_DETAIL_SELECT_WITH_SIGNATURE_AND_PHONES = `
      id,
      public_no,
      order_type,
      status,
      issue_description,
      diagnosis_result,
      quotation_amount,
      deposit_amount,
      balance_amount,
      is_paid,
      approval_status,
      approval_sent_at,
      approval_confirmed_at,
      technician_name,
      internal_tag,
      warranty_text,
      pause_reason,
      cancel_reason,
      customer_signature,
      contact_phones,
      completed_at,
      delivered_at,
      created_at,
      updated_at,
      customers:customer_id ( id, name, phone_e164, phone_raw ),
      devices:device_id ( id, brand, model, serial_or_imei ),
      suppliers:supplier_id ( id, name, short_name, color )
    `;

const ORDER_DETAIL_SELECT_WITH_SIGNATURE = `
      id,
      public_no,
      order_type,
      status,
      issue_description,
      diagnosis_result,
      quotation_amount,
      deposit_amount,
      balance_amount,
      is_paid,
      approval_status,
      approval_sent_at,
      approval_confirmed_at,
      technician_name,
      internal_tag,
      warranty_text,
      pause_reason,
      cancel_reason,
      customer_signature,
      completed_at,
      delivered_at,
      created_at,
      updated_at,
      customers:customer_id ( id, name, phone_e164, phone_raw ),
      devices:device_id ( id, brand, model, serial_or_imei ),
      suppliers:supplier_id ( id, name, short_name, color )
    `;

const ORDER_DETAIL_SELECT_FALLBACK = `
      id,
      public_no,
      order_type,
      status,
      issue_description,
      diagnosis_result,
      quotation_amount,
      deposit_amount,
      balance_amount,
      is_paid,
      approval_status,
      approval_sent_at,
      approval_confirmed_at,
      technician_name,
      internal_tag,
      warranty_text,
      pause_reason,
      cancel_reason,
      completed_at,
      delivered_at,
      created_at,
      updated_at,
      customers:customer_id ( id, name, phone_e164, phone_raw ),
      devices:device_id ( id, brand, model, serial_or_imei ),
      suppliers:supplier_id ( id, name, short_name, color )
    `;

function isMissingCustomerSignatureColumn(message?: string): boolean {
  const msg = (message ?? "").toLowerCase();
  return msg.includes("customer_signature") && (msg.includes("column") || msg.includes("schema cache"));
}

function isMissingContactPhonesColumn(message?: string): boolean {
  const msg = (message ?? "").toLowerCase();
  return msg.includes("contact_phones") && (msg.includes("column") || msg.includes("schema cache"));
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) return null;

  const supabase = createSupabaseServerClient();

  const withSignatureAndPhones = await supabase
    .from("repair_orders")
    .select(ORDER_DETAIL_SELECT_WITH_SIGNATURE_AND_PHONES)
    .eq("id", id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  let data: Record<string, any> | null = withSignatureAndPhones.data as Record<string, any> | null;
  let error = withSignatureAndPhones.error;
  let signatureSupported = true;
  let contactPhonesSupported = true;

  if (error && isMissingContactPhonesColumn(error.message)) {
    contactPhonesSupported = false;
    const withoutPhones = await supabase
      .from("repair_orders")
      .select(ORDER_DETAIL_SELECT_WITH_SIGNATURE)
      .eq("id", id)
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .single();
    data = withoutPhones.data as Record<string, any> | null;
    error = withoutPhones.error;
  }

  if (error && isMissingCustomerSignatureColumn(error.message)) {
    signatureSupported = false;
    const fallback = await supabase
      .from("repair_orders")
      .select(ORDER_DETAIL_SELECT_FALLBACK)
      .eq("id", id)
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .single();
    data = fallback.data as Record<string, any> | null;
    error = fallback.error;
  }

  if (error || !data) return null;

  const customer = Array.isArray(data.customers) ? data.customers[0] : data.customers;
  const device = Array.isArray(data.devices) ? data.devices[0] : data.devices;
  const supplier = Array.isArray(data.suppliers) ? data.suppliers[0] : data.suppliers;

  return {
    id: data.id,
    publicNo: data.public_no,
    orderType: data.order_type,
    status: data.status,
    issueDescription: data.issue_description,
    diagnosisResult: data.diagnosis_result,
    quotationAmount: data.quotation_amount,
    depositAmount: data.deposit_amount,
    balanceAmount: data.balance_amount,
    isPaid: data.is_paid ?? false,
    approvalStatus: data.approval_status ?? "pending",
    approvalSentAt: data.approval_sent_at,
    approvalConfirmedAt: data.approval_confirmed_at,
    technicianName: data.technician_name,
    internalTag: data.internal_tag,
    warrantyText: data.warranty_text,
    pauseReason: data.pause_reason,
    cancelReason: data.cancel_reason,
    customerSignature: signatureSupported ? data.customer_signature ?? null : null,
    contactPhones:
      contactPhonesSupported && Array.isArray(data.contact_phones)
        ? data.contact_phones.filter((p: unknown) => typeof p === "string" && p.trim())
        : [],
    completedAt: data.completed_at,
    deliveredAt: data.delivered_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          phoneE164: customer.phone_e164,
          phoneRaw: customer.phone_raw,
        }
      : null,
    device: device
      ? {
          id: device.id,
          brand: device.brand,
          model: device.model,
          serialOrImei: device.serial_or_imei,
        }
      : null,
    supplier: supplier
      ? {
          id: supplier.id,
          name: supplier.name,
          shortName: supplier.short_name,
          color: supplier.color,
        }
      : null,
  };
}

export async function getOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) return [];

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("order_events")
    .select("id, event_type, payload, operator_name, created_at")
    .eq("order_id", orderId)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    operatorName: row.operator_name,
    createdAt: row.created_at,
  }));
}
