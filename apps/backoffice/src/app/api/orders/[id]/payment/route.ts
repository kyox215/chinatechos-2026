import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!env.defaultStoreId) {
    return NextResponse.json({ error: "Missing env: DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const body = (await request.json()) as {
    depositAmount?: number | null;
    balanceAmount?: number | null;
    isPaid?: boolean;
    operatorName?: string;
  };

  const supabase = createSupabaseServerClient();

  const current = await supabase
    .from("repair_orders")
    .select("id, status, quotation_amount, deposit_amount, balance_amount, is_paid")
    .eq("id", params.id)
    .eq("store_id", env.defaultStoreId)
    .is("deleted_at", null)
    .single();

  if (current.error || !current.data) {
    return NextResponse.json({ error: "工单不存在或无权限" }, { status: 404 });
  }

  if (current.data.status === "completed" || current.data.status === "cancelled") {
    return NextResponse.json({ error: "已完成或已取消的工单不可修改付款" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.depositAmount !== undefined) {
    patch.deposit_amount = body.depositAmount;
  }
  if (body.balanceAmount !== undefined) {
    patch.balance_amount = body.balanceAmount;
  }
  if (body.isPaid !== undefined) {
    patch.is_paid = body.isPaid;
  }

  const updateRes = await supabase
    .from("repair_orders")
    .update(patch)
    .eq("id", params.id)
    .eq("store_id", env.defaultStoreId)
    .is("deleted_at", null)
    .select("id, deposit_amount, balance_amount, is_paid")
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  await writeOrderEvent({
    storeId: env.defaultStoreId,
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
