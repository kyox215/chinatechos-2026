import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!env.defaultStoreId) {
    return NextResponse.json({ error: "Missing env: DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const body = (await request.json()) as { operatorName?: string };

  const supabase = createSupabaseServerClient();

  const current = await supabase
    .from("repair_orders")
    .select("id, status, delivered_at")
    .eq("id", params.id)
    .eq("store_id", env.defaultStoreId)
    .is("deleted_at", null)
    .single();

  if (current.error || !current.data) {
    return NextResponse.json({ error: "工单不存在或无权限" }, { status: 404 });
  }

  if (current.data.status !== "waiting_pickup") {
    return NextResponse.json({ error: "仅在待取件状态下可标记交付" }, { status: 400 });
  }

  if (current.data.delivered_at) {
    return NextResponse.json({ error: "该工单已标记为已交付" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updateRes = await supabase
    .from("repair_orders")
    .update({ delivered_at: now, updated_at: now })
    .eq("id", params.id)
    .eq("store_id", env.defaultStoreId)
    .is("deleted_at", null)
    .select("id, delivered_at")
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  await writeOrderEvent({
    storeId: env.defaultStoreId,
    orderId: params.id,
    eventType: "delivered",
    payload: { deliveredAt: now },
    operatorName: body.operatorName ?? "frontdesk",
  });

  return NextResponse.json({ ok: true, id: params.id, deliveredAt: now });
}
