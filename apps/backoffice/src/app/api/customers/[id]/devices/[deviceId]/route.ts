import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; deviceId: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const { id, deviceId } = await context.params;
  const body = (await request.json()) as {
    brand?: string;
    model?: string;
    serialOrImei?: string | null;
  };

  const supabase = createSupabaseServerClient();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.brand !== undefined) patch.brand = body.brand.trim();
  if (body.model !== undefined) patch.model = body.model.trim();
  if (body.serialOrImei !== undefined) patch.serial_or_imei = body.serialOrImei;

  const result = await supabase
    .from("devices")
    .update(patch)
    .eq("id", deviceId)
    .eq("customer_id", id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .select("id, brand, model, serial_or_imei")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result.data });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; deviceId: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const { id, deviceId } = await context.params;
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("devices")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", deviceId)
    .eq("customer_id", id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: result.data.id });
}
