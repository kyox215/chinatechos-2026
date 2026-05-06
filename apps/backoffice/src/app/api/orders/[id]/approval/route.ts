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
  const body = (await request.json()) as {
    result: "approved" | "rejected" | "pending";
    note?: string;
    operatorName?: string;
  };

  const { result, note, operatorName = "frontdesk" } = body;

  if (!result || !["approved", "rejected", "pending"].includes(result)) {
    return NextResponse.json({ error: "result 必须为 approved / rejected / pending" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const current = await supabase
    .from("repair_orders")
    .select("id, status, order_type")
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (current.error || !current.data) {
    return NextResponse.json({ error: "工单不存在或无权限" }, { status: 404 });
  }

  if (current.data.status !== "waiting_approval") {
    return NextResponse.json({ error: "仅在待客户确认报价状态下可操作审批" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    approval_status: result,
    updated_at: new Date().toISOString(),
  };

  if (result === "approved") {
    patch.approval_confirmed_at = new Date().toISOString();
    patch.status = "repairing";
  } else if (result === "rejected") {
    patch.approval_confirmed_at = new Date().toISOString();
    patch.status = "cancelled";
    patch.cancel_reason = note || "客户拒绝报价";
  }

  const updateRes = await supabase
    .from("repair_orders")
    .update(patch)
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .select("id, status, approval_status")
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  await writeOrderEvent({
    storeId: storeId,
    orderId: params.id,
    eventType: "approval_marked",
    payload: { result, note: note || null },
    operatorName,
  });

  if (result === "approved" || result === "rejected") {
    await writeOrderEvent({
      storeId: storeId,
      orderId: params.id,
      eventType: "status_changed",
      payload: {
        fromStatus: "waiting_approval",
        toStatus: result === "approved" ? "repairing" : "cancelled",
        ...(result === "rejected" ? { cancelReason: note || "客户拒绝报价" } : {}),
      },
      operatorName,
    });
  }

  return NextResponse.json({
    ok: true,
    id: params.id,
    status: updateRes.data.status,
    approvalStatus: updateRes.data.approval_status,
  });
}
