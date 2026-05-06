import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { validateOrderTransition } from "@/lib/domain/order-status";
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
  const contentType = request.headers.get("content-type") ?? "";
  let toStatus = "";
  let operatorName = "frontdesk";
  let cancelReason = "";
  let supplierId = "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      toStatus?: string;
      operatorName?: string;
      cancelReason?: string;
      supplierId?: string;
    };
    toStatus = String(body.toStatus ?? "");
    operatorName = String(body.operatorName ?? "frontdesk");
    cancelReason = String(body.cancelReason ?? "");
    supplierId = String(body.supplierId ?? "");
  } else {
    const formData = await request.formData();
    toStatus = String(formData.get("toStatus") ?? "");
    operatorName = String(formData.get("operatorName") ?? "frontdesk");
    cancelReason = String(formData.get("cancelReason") ?? "");
    supplierId = String(formData.get("supplierId") ?? "");
  }

  if (!toStatus) {
    return NextResponse.json({ error: "Missing field: toStatus" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const current = await supabase
    .from("repair_orders")
    .select("id, store_id, status, quotation_amount, delivered_at, is_paid")
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (current.error || !current.data) {
    return NextResponse.json({ error: "工单不存在或无权限" }, { status: 404 });
  }

  const validation = validateOrderTransition(current.data.status, toStatus);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    status: toStatus,
    updated_at: new Date().toISOString(),
  };

  if (toStatus === "quoted" || toStatus === "waiting_approval") {
    patch.approval_sent_at = new Date().toISOString();
  }
  if (toStatus === "cancelled") {
    if (current.data.status === "waiting_approval" || current.data.status === "quoted") {
      patch.approval_status = "rejected";
    }
    patch.cancel_reason = cancelReason || "已取消";
  }
  if (toStatus === "completed") {
    if (!current.data.delivered_at) {
      patch.delivered_at = new Date().toISOString();
    }
    patch.completed_at = new Date().toISOString();
  }
  if (toStatus === "parts_ordered" && supplierId) {
    patch.supplier_id = supplierId;
  }

  const updateRes = await supabase
    .from("repair_orders")
    .update(patch)
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .select("id, status")
    .single();

  if (updateRes.error || !updateRes.data) {
    return NextResponse.json({ error: updateRes.error?.message ?? "状态更新失败" }, { status: 500 });
  }

  await writeOrderEvent({
    storeId: storeId,
    orderId: params.id,
    eventType: "status_changed",
    payload: {
      fromStatus: current.data.status,
      toStatus,
      ...(toStatus === "cancelled"
        ? { cancelReason: cancelReason || "客户拒绝报价" }
        : {}),
    },
    operatorName,
  });

  const accept = request.headers.get("accept") ?? "";
  const shouldReturnJson = contentType.includes("application/json") || accept.includes("application/json");
  const referer = request.headers.get("referer");
  if (!shouldReturnJson && referer) {
    return NextResponse.redirect(referer, { status: 303 });
  }

  return NextResponse.json({
    ok: true,
    orderId: params.id,
    fromStatus: current.data.status,
    toStatus: updateRes.data.status,
  });
}
