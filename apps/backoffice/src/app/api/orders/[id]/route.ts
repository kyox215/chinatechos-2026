import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ORDER_FIELDS = [
  "diagnosis_result",
  "quotation_amount",
  "deposit_amount",
  "balance_amount",
  "technician_name",
  "internal_tag",
  "warranty_text",
  "pause_reason",
  "issue_description",
  "customer_signature",
  "contact_phones",
  "fault_prices",
] as const;

const FAULT_PRICE_KEYS = new Set([
  "screen",
  "battery",
  "charging",
  "camera",
  "water",
  "motherboard",
  "system",
  "backcover",
  "faceid",
  "speaker",
  "mic",
  "buttons",
]);

function parseMoney(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100) / 100;
}

function isMissingColumn(message: string | undefined, columnName: string): boolean {
  const msg = (message ?? "").toLowerCase();
  return msg.includes(columnName) && (msg.includes("column") || msg.includes("schema cache"));
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店，请配置 DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const rawBody = (await request.json()) as Record<string, unknown>;
  const body: Record<string, unknown> = { ...rawBody };
  if (rawBody.issueDescription !== undefined) body.issue_description = rawBody.issueDescription;
  if (rawBody.quotationAmount !== undefined) body.quotation_amount = rawBody.quotationAmount;
  if (rawBody.depositAmount !== undefined) body.deposit_amount = rawBody.depositAmount;
  if (rawBody.balanceAmount !== undefined) body.balance_amount = rawBody.balanceAmount;
  if (rawBody.technicianName !== undefined) body.technician_name = rawBody.technicianName;
  if (rawBody.internalTag !== undefined) body.internal_tag = rawBody.internalTag;
  if (rawBody.warrantyText !== undefined) body.warranty_text = rawBody.warrantyText;
  if (rawBody.pauseReason !== undefined) body.pause_reason = rawBody.pauseReason;
  if (rawBody.customerName !== undefined) body.customer_name = rawBody.customerName;
  if (rawBody.customerPhone !== undefined) body.customer_phone = rawBody.customerPhone;
  if (rawBody.serialOrImei !== undefined) body.serial_or_imei = rawBody.serialOrImei;
  if (rawBody.customerSignature !== undefined) body.customer_signature = rawBody.customerSignature;
  if (rawBody.contactPhones !== undefined) body.contact_phones = rawBody.contactPhones;
  if (rawBody.faultPrices !== undefined) body.fault_prices = rawBody.faultPrices;
  if (rawBody.supplierId !== undefined) body.supplier_id = rawBody.supplierId;

  const supabase = createSupabaseServerClient();

  const current = await supabase
    .from("repair_orders")
    .select("id, status, customer_id, device_id, quotation_amount, deposit_amount")
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (current.error || !current.data) {
    return NextResponse.json({ error: "工单不存在或无权限" }, { status: 404 });
  }

  const isSignatureOnly =
    body.customer_signature !== undefined &&
    Object.keys(rawBody).every((k) => k === "customerSignature" || k === "operatorName");

  if ((current.data.status === "completed" || current.data.status === "cancelled") && !isSignatureOnly) {
    return NextResponse.json({ error: "已完成或已取消的工单不可编辑" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const updatedFields: string[] = [];
  const parsedQuotation = body.quotation_amount !== undefined ? parseMoney(body.quotation_amount) : undefined;
  if (parsedQuotation !== undefined && Number.isNaN(parsedQuotation)) {
    return NextResponse.json({ error: "报价金额无效" }, { status: 400 });
  }
  const parsedDeposit = body.deposit_amount !== undefined ? parseMoney(body.deposit_amount) : undefined;
  if (parsedDeposit !== undefined && Number.isNaN(parsedDeposit)) {
    return NextResponse.json({ error: "定金金额无效" }, { status: 400 });
  }

  for (const field of ORDER_FIELDS) {
    if (field in body) {
      if (field === "balance_amount" && (body.quotation_amount !== undefined || body.deposit_amount !== undefined)) {
        continue;
      }
      if (field === "quotation_amount") {
        patch[field] = parsedQuotation;
      } else if (field === "deposit_amount") {
        patch[field] = parsedDeposit;
      } else if (field === "contact_phones") {
        const rawPhones = body.contact_phones;
        if (rawPhones == null) {
          patch[field] = [];
        } else if (Array.isArray(rawPhones)) {
          const normalized = rawPhones
            .map((p) => String(p ?? "").trim())
            .filter(Boolean);
          patch[field] = Array.from(new Set(normalized));
        } else {
          return NextResponse.json({ error: "contactPhones 必须是字符串数组" }, { status: 400 });
        }
      } else if (field === "fault_prices") {
        const raw = body.fault_prices;
        if (raw == null) {
          patch[field] = {};
        } else if (typeof raw === "object" && !Array.isArray(raw)) {
          const entries = Object.entries(raw as Record<string, unknown>);
          const cleaned: Record<string, string> = {};
          for (const [key, value] of entries) {
            if (!FAULT_PRICE_KEYS.has(key)) continue;
            const s = String(value ?? "").trim();
            if (!s) continue;
            const n = Number(s);
            if (!Number.isFinite(n) || n < 0) continue;
            cleaned[key] = n.toFixed(2);
          }
          patch[field] = cleaned;
        } else {
          return NextResponse.json({ error: "faultPrices 必须是对象" }, { status: 400 });
        }
      } else {
        patch[field] = body[field] ?? null;
      }
      updatedFields.push(field);
    }
  }

  const touchesMoney =
    body.quotation_amount !== undefined ||
    body.deposit_amount !== undefined ||
    patch.quotation_amount !== undefined ||
    patch.deposit_amount !== undefined;
  if (touchesMoney) {
    const nextQ =
      parsedQuotation !== undefined
        ? Number(parsedQuotation ?? 0)
        : Number(current.data.quotation_amount ?? 0);
    const nextD =
      parsedDeposit !== undefined
        ? Number(parsedDeposit ?? 0)
        : Number(current.data.deposit_amount ?? 0);
    patch.balance_amount = Math.max(0, nextQ - nextD);
    if (!updatedFields.includes("balance_amount")) updatedFields.push("balance_amount");
  }

  if (body.supplier_id !== undefined) {
    const raw = body.supplier_id;
    const sid = raw === null || raw === "" ? null : String(raw);
    if (sid) {
      const supCheck = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", sid)
        .eq("store_id", storeId)
        .maybeSingle();
      if (supCheck.error || !supCheck.data) {
        return NextResponse.json({ error: "供应商无效或不属于当前门店" }, { status: 400 });
      }
      patch.supplier_id = sid;
    } else {
      patch.supplier_id = null;
    }
    updatedFields.push("supplier_id");
  }

  if (body.customer_name !== undefined || body.customer_phone !== undefined) {
    const customerPhone = body.customer_phone ? String(body.customer_phone).trim() : null;
    const customerName = body.customer_name ? String(body.customer_name).trim() : null;

    if (customerPhone && current.data.customer_id) {
      const customerUpdate = await supabase
        .from("customers")
        .update({
          name: customerName,
          phone_e164: customerPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.data.customer_id)
        .eq("store_id", storeId);
      if (customerUpdate.error) {
        return NextResponse.json({ error: customerUpdate.error.message }, { status: 500 });
      }
      updatedFields.push("customer");
    }
  }

  if (body.brand !== undefined || body.model !== undefined || body.serial_or_imei !== undefined) {
    if (current.data.device_id) {
      const devicePatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.brand !== undefined) devicePatch.brand = String(body.brand ?? "").trim();
      if (body.model !== undefined) devicePatch.model = String(body.model ?? "").trim();
      if (body.serial_or_imei !== undefined) devicePatch.serial_or_imei = body.serial_or_imei ? String(body.serial_or_imei).trim() : null;

      const deviceUpdate = await supabase
        .from("devices")
        .update(devicePatch)
        .eq("id", current.data.device_id)
        .eq("store_id", storeId);
      if (deviceUpdate.error) {
        return NextResponse.json({ error: deviceUpdate.error.message }, { status: 500 });
      }
      updatedFields.push("device");
    }
  }

  if (Object.keys(patch).length <= 1 && updatedFields.length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  if (Object.keys(patch).length > 1) {
    const optionalColumns = ["fault_prices", "contact_phones", "customer_signature"] as const;

    let activePatch = { ...patch };
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= optionalColumns.length; attempt++) {
      let query = supabase
        .from("repair_orders")
        .update(activePatch)
        .eq("id", params.id)
        .eq("store_id", storeId)
        .is("deleted_at", null);

      if (!isSignatureOnly) {
        query = query.not("status", "in", "(completed,cancelled)");
      }

      const updateRes = await query.select("id, status").single();

      if (!updateRes.error) {
        lastError = null;
        break;
      }

      const msg = updateRes.error.message;
      const dropped = optionalColumns.find(
        (col) => col in activePatch && isMissingColumn(msg, col),
      );
      if (dropped) {
        const { [dropped]: _, ...rest } = activePatch;
        activePatch = rest;
        lastError = null;
        continue;
      }

      lastError = msg;
      break;
    }

    if (lastError) {
      return NextResponse.json({ error: lastError }, { status: 500 });
    }
  }

  if (updatedFields.length > 0) {
    await writeOrderEvent({
      storeId,
      orderId: params.id,
      eventType: "fields_updated",
      payload: { fields: updatedFields },
      operatorName: String(body.operatorName ?? "frontdesk"),
    });
  }

  return NextResponse.json({ ok: true, id: params.id });
}
