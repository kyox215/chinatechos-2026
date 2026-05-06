import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店，请配置 DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const body = (await request.json()) as {
    brand: string;
    model: string;
    serialOrImei?: string;
    deviceNotes?: string;
  };

  if (!body.brand?.trim()) {
    return NextResponse.json({ error: "设备品牌不能为空" }, { status: 400 });
  }
  if (!body.model?.trim()) {
    return NextResponse.json({ error: "设备型号不能为空" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const customer = await supabase
    .from("customers")
    .select("id")
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (customer.error || !customer.data) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  const result = await supabase
    .from("devices")
    .insert({
      store_id: storeId,
      customer_id: params.id,
      brand: body.brand.trim(),
      model: body.model.trim(),
      serial_or_imei: body.serialOrImei?.trim() || null,
      device_notes: body.deviceNotes?.trim() || null,
    })
    .select("id, brand, model")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 });
}
