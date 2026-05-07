import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { generatePublicNo } from "@/lib/domain/public-no";
import { writeOrderEvent } from "@/lib/data/order-events";

export type CreateOrderInput = {
  orderType?: "quick_repair" | "dropoff_repair";
  customerPhone: string;
  customerName?: string;
  brand: string;
  model: string;
  serialOrImei?: string;
  issueDescription: string;
  quotationAmount?: number;
  depositAmount?: number;
  technicianName?: string;
  internalTag?: string;
  warrantyText?: string;
};

export async function createOrder(input: CreateOrderInput) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    throw new Error("无法确定门店，请配置 DEFAULT_STORE_ID 或确保 stores 表有数据");
  }

  const supabase = createSupabaseServerClient();

  // Normalize phone to E.164
  const phoneE164 = normalizePhone(input.customerPhone);

  // Find or create customer
  let customerId: string;
  const existingCustomer = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("phone_e164", phoneE164)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingCustomer.data) {
    customerId = existingCustomer.data.id;
  } else {
    const newCustomer = await supabase
      .from("customers")
      .insert({
        store_id: storeId,
        name: input.customerName || null,
        phone_raw: input.customerPhone,
        phone_e164: phoneE164,
      })
      .select("id")
      .single();

    if (newCustomer.error) {
      throw new Error(`创建客户失败: ${newCustomer.error.message}`);
    }
    customerId = newCustomer.data.id;
  }

  // Find or create device
  let deviceId: string;
  const existingDevice = await supabase
    .from("devices")
    .select("id")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .eq("brand", input.brand)
    .eq("model", input.model)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingDevice.data) {
    deviceId = existingDevice.data.id;
  } else {
    const newDevice = await supabase
      .from("devices")
      .insert({
        store_id: storeId,
        customer_id: customerId,
        brand: input.brand,
        model: input.model,
        serial_or_imei: input.serialOrImei || null,
      })
      .select("id")
      .single();

    if (newDevice.error) {
      throw new Error(`创建设备失败: ${newDevice.error.message}`);
    }
    deviceId = newDevice.data.id;
  }

  // Get store code for public_no
  const store = await supabase
    .from("stores")
    .select("store_code")
    .eq("id", storeId)
    .single();

  if (store.error || !store.data) {
    throw new Error("门店不存在");
  }

  const publicNo = await generatePublicNo(store.data.store_code);
  const quotation = Number.isFinite(input.quotationAmount ?? NaN) ? Math.max(0, Number(input.quotationAmount)) : 0;
  const deposit = Number.isFinite(input.depositAmount ?? NaN) ? Math.max(0, Number(input.depositAmount)) : 0;
  const balance = Math.max(0, quotation - deposit);

  // Create repair order
  const orderRes = await supabase
    .from("repair_orders")
    .insert({
      store_id: storeId,
      public_no: publicNo,
      order_type: input.orderType ?? "dropoff_repair",
      status: "new",
      customer_id: customerId,
      device_id: deviceId,
      issue_description: input.issueDescription,
      quotation_amount: input.quotationAmount ?? null,
      deposit_amount: input.depositAmount ?? null,
      balance_amount: balance || null,
      technician_name: input.technicianName || null,
      internal_tag: input.internalTag || null,
      warranty_text: input.warrantyText || "6个月",
    })
    .select("id, public_no, status")
    .single();

  if (orderRes.error) {
    throw new Error(`创建工单失败: ${orderRes.error.message}`);
  }

  // Write creation event
  await writeOrderEvent({
    storeId,
    orderId: orderRes.data.id,
    eventType: "created",
    payload: {
      orderType: input.orderType,
      publicNo: publicNo,
      customerPhone: phoneE164,
      brand: input.brand,
      model: input.model,
    },
    operatorName: "frontdesk",
  });

  return orderRes.data;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^+\d]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("39")) return `+${digits}`;
  return `+39${digits}`;
}
