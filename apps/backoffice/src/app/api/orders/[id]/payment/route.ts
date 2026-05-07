import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const params = await context.params;
  const body = (await request.json()) as {
    quotationAmount?: number | null;
    depositAmount?: number | null;
    isPaid?: boolean;
    operatorName?: string;
  };

  const supabase = createSupabaseServerClient();

  const current = await supabase
    .from("repair_orders")
    .select("id, status, quotation_amount, deposit_amount, balance_amount, is_paid")
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (current.error || !current.data) {
    return NextResponse.json({ error: "工单不存在或无权限" }, { status: 404 });
  }

  if (current.data.status === "completed" || current.data.status === "cancelled") {
    return NextResponse.json({ error: "已完成或已取消的工单不可修改付款" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.quotationAmount !== undefined) {
    patch.quotation_amount = body.quotationAmount;
  }
  if (body.depositAmount !== undefined) {
    patch.deposit_amount = body.depositAmount;
  }

  const finalQuotation = body.quotationAmount !== undefined
    ? (body.quotationAmount ?? 0)
    : (current.data.quotation_amount ?? 0);
  const finalDeposit = body.depositAmount !== undefined
    ? (body.depositAmount ?? 0)
    : (current.data.deposit_amount ?? 0);
  patch.balance_amount = Math.max(0, finalQuotation - finalDeposit);

  if (body.isPaid !== undefined) {
    patch.is_paid = body.isPaid;
  }

  const updateRes = await supabase
    .from("repair_orders")
    .update(patch)
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .select("id, deposit_amount, balance_amount, is_paid")
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  await writeOrderEvent({
    storeId: storeId,
    orderId: params.id,
    eventType: "payment_updated",
    payload: {
      deposit: updateRes.data.deposit_amount,
      balance: updateRes.data.balance_amount,
      isPaid: updateRes.data.is_paid,
    },
    operatorName: body.operatorName ?? "frontdesk",
  });

  return NextResponse.json({ ok: true, ...updateRes.data });
}
