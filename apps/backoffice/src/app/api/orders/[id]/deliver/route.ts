import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const params = await context.params;
  const body = (await request.json()) as { operatorName?: string };

  const supabase = createSupabaseServerClient();

  const current = await supabase
    .from("repair_orders")
    .select("id, status, delivered_at")
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (current.error || !current.data) {
    return NextResponse.json({ error: "工单不存在或无权限" }, { status: 404 });
  }

  const deliverable = current.data.status === "notified" || current.data.status === "unfixed_pickup";
  if (!deliverable) {
    return NextResponse.json({ error: "仅在「修好已通知」或「未修待取件」状态下可标记交付" }, { status: 400 });
  }

  if (current.data.delivered_at) {
    return NextResponse.json({ error: "该工单已标记为已交付" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updateRes = await supabase
    .from("repair_orders")
    .update({ delivered_at: now, completed_at: now, status: "completed", updated_at: now })
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .select("id, delivered_at, status")
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  await writeOrderEvent({
    storeId: storeId,
    orderId: params.id,
    eventType: "delivered",
    payload: { deliveredAt: now },
    operatorName: body.operatorName ?? "frontdesk",
  });

  await writeOrderEvent({
    storeId: storeId,
    orderId: params.id,
    eventType: "status_changed",
    payload: { fromStatus: current.data.status, toStatus: "completed" },
    operatorName: body.operatorName ?? "frontdesk",
  });

  return NextResponse.json({ ok: true, id: params.id, deliveredAt: now });
}
