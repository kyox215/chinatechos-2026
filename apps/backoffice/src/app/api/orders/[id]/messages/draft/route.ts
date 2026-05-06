import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildWhatsAppLink, renderTemplate } from "@/lib/domain/whatsapp";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!env.defaultStoreId) {
    return NextResponse.json({ error: "Missing env: DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const body = (await request.json()) as {
    templateCode?: string;
    customBody?: string;
    operatorName?: string;
  };

  const supabase = createSupabaseServerClient();

  // Load order with customer + device
  const order = await supabase
    .from("repair_orders")
    .select(`
      id, public_no, quotation_amount,
      customers:customer_id ( name, phone_e164 ),
      devices:device_id ( brand, model )
    `)
    .eq("id", params.id)
    .eq("store_id", env.defaultStoreId)
    .is("deleted_at", null)
    .single();

  if (order.error || !order.data) {
    return NextResponse.json({ error: "工单不存在" }, { status: 404 });
  }

  const customer = Array.isArray(order.data.customers)
    ? order.data.customers[0]
    : order.data.customers;
  const device = Array.isArray(order.data.devices)
    ? order.data.devices[0]
    : order.data.devices;

  if (!customer?.phone_e164) {
    return NextResponse.json({ error: "客户无电话号码，无法发送消息" }, { status: 400 });
  }

  let messageBody: string;

  if (body.customBody) {
    messageBody = body.customBody;
  } else if (body.templateCode) {
    const template = await supabase
      .from("message_templates")
      .select("body")
      .eq("store_id", env.defaultStoreId)
      .eq("code", body.templateCode)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (!template.data) {
      return NextResponse.json({ error: `模板 ${body.templateCode} 不存在` }, { status: 404 });
    }
    messageBody = renderTemplate(template.data.body, {
      customerName: customer.name ?? "Cliente",
      publicNo: order.data.public_no,
      quotation: order.data.quotation_amount != null
        ? `€${order.data.quotation_amount}`
        : "",
      deviceLabel: [device?.brand, device?.model].filter(Boolean).join(" "),
    });
  } else {
    return NextResponse.json({ error: "需要 templateCode 或 customBody" }, { status: 400 });
  }

  const waLink = buildWhatsAppLink(customer.phone_e164, messageBody);

  // Insert message_log
  const logRes = await supabase
    .from("message_logs")
    .insert({
      store_id: env.defaultStoreId,
      order_id: params.id,
      customer_id: customer.phone_e164 ? undefined : null,
      template_code: body.templateCode ?? null,
      message_body: messageBody,
      status: "draft",
      operator_name: body.operatorName ?? "frontdesk",
    })
    .select("id")
    .single();

  if (logRes.error) {
    return NextResponse.json({ error: logRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    messageLogId: logRes.data.id,
    waLink,
    messageBody,
  });
}
