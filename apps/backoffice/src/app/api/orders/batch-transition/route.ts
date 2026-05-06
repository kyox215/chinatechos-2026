import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { validateOrderTransition } from "@/lib/domain/order-status";
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
  };

  if (!Array.isArray(body.orderIds) || body.orderIds.length === 0) {
    return NextResponse.json({ error: "orderIds 不能为空" }, { status: 400 });
  }
  if (!body.toStatus) {
    return NextResponse.json({ error: "toStatus 不能为空" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const operatorName = body.operatorName ?? "frontdesk";
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const orderId of body.orderIds) {
    const current = await supabase
      .from("repair_orders")
      .select("id, status, order_type, quotation_amount, delivered_at, is_paid")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .single();

    if (current.error || !current.data) {
      results.push({ id: orderId, ok: false, error: "工单不存在" });
      continue;
    }

    const validation = validateOrderTransition(current.data.status, body.toStatus, {
      orderType: current.data.order_type,
      quotationAmount: current.data.quotation_amount,
      deliveredAt: current.data.delivered_at,
      isPaid: current.data.is_paid,
    });

    if (!validation.ok) {
      results.push({ id: orderId, ok: false, error: validation.reason });
      continue;
    }

    const patch: Record<string, unknown> = {
      status: body.toStatus,
      updated_at: new Date().toISOString(),
    };

    if (body.toStatus === "waiting_approval") {
      patch.approval_sent_at = new Date().toISOString();
    }
    if (body.toStatus === "waiting_pickup") {
      patch.completed_at = new Date().toISOString();
    }
    if (body.toStatus === "repairing" && current.data.status === "waiting_approval") {
      patch.approval_status = "approved";
      patch.approval_confirmed_at = new Date().toISOString();
    }
    if (body.toStatus === "completed" && !current.data.delivered_at) {
      patch.delivered_at = new Date().toISOString();
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
      payload: { fromStatus: current.data.status, toStatus: body.toStatus, batch: true },
      operatorName,
    });

    results.push({ id: orderId, ok: true });
  }

  const successCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, total: results.length, successCount, results });
}
