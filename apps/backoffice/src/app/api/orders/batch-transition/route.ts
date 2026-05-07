import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { validateOrderTransition } from "@/lib/domain/order-status";
import { assertSupplierBelongsToStore } from "@/lib/api/supplier-validation";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const body = (await request.json()) as {
    orderIds: string[];
    toStatus: string;
    operatorName?: string;
    supplierId?: string;
    cancelReason?: string;
  };

  if (!Array.isArray(body.orderIds) || body.orderIds.length === 0) {
    return NextResponse.json({ error: "orderIds 不能为空" }, { status: 400 });
  }
  if (!body.toStatus) {
    return NextResponse.json({ error: "toStatus 不能为空" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const operatorName = body.operatorName ?? "frontdesk";
  const cancelReasonDefault = String(body.cancelReason ?? "").trim();
  const results: { id: string; ok: boolean; error?: string }[] = [];

  if (body.toStatus === "parts_ordered" && body.supplierId) {
    const sup = await assertSupplierBelongsToStore(supabase, storeId, body.supplierId);
    if (!sup.ok) {
      return NextResponse.json({ error: sup.error }, { status: 400 });
    }
  }

  for (const orderId of body.orderIds) {
    const current = await supabase
      .from("repair_orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .single();

    if (current.error || !current.data) {
      results.push({ id: orderId, ok: false, error: "工单不存在" });
      continue;
    }

    const validation = validateOrderTransition(current.data.status, body.toStatus);

    if (!validation.ok) {
      results.push({ id: orderId, ok: false, error: validation.reason });
      continue;
    }

    const patch: Record<string, unknown> = {
      status: body.toStatus,
      updated_at: new Date().toISOString(),
    };

    if (body.toStatus === "quoted" || body.toStatus === "waiting_approval") {
      patch.approval_sent_at = new Date().toISOString();
    }
    if (body.toStatus === "completed") {
      patch.delivered_at = new Date().toISOString();
      patch.completed_at = new Date().toISOString();
    }
    if (body.toStatus === "cancelled") {
      if (current.data.status === "waiting_approval" || current.data.status === "quoted") {
        patch.approval_status = "rejected";
      }
      patch.cancel_reason = cancelReasonDefault || "已取消";
    }
    if (body.toStatus === "parts_ordered" && body.supplierId) {
      patch.supplier_id = body.supplierId;
    }

    const updateRes = await supabase
      .from("repair_orders")
      .update(patch)
      .eq("id", orderId)
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (updateRes.error) {
      results.push({ id: orderId, ok: false, error: updateRes.error.message });
      continue;
    }

    await writeOrderEvent({
      storeId,
      orderId,
      eventType: "status_changed",
      payload: {
        fromStatus: current.data.status,
        toStatus: body.toStatus,
        batch: true,
        ...(body.toStatus === "cancelled"
          ? { cancelReason: cancelReasonDefault || "已取消" }
          : {}),
      },
      operatorName,
    });

    results.push({ id: orderId, ok: true });
  }

  const successCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, total: results.length, successCount, results });
}
