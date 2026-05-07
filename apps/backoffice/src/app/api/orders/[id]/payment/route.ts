import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseMoney(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100) / 100;
}

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

  const parsedQuotation = body.quotationAmount !== undefined ? parseMoney(body.quotationAmount) : undefined;
  if (parsedQuotation !== undefined && Number.isNaN(parsedQuotation)) {
    return NextResponse.json({ error: "报价金额无效" }, { status: 400 });
  }
  const parsedDeposit = body.depositAmount !== undefined ? parseMoney(body.depositAmount) : undefined;
  if (parsedDeposit !== undefined && Number.isNaN(parsedDeposit)) {
    return NextResponse.json({ error: "定金金额无效" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (parsedQuotation !== undefined) {
    patch.quotation_amount = parsedQuotation;
  }
  if (parsedDeposit !== undefined) {
    patch.deposit_amount = parsedDeposit;
  }

  if (body.isPaid !== undefined) {
    patch.is_paid = body.isPaid;
  }

  const finalQuotation = parsedQuotation !== undefined
    ? (parsedQuotation ?? 0)
    : (current.data.quotation_amount ?? 0);
  const finalDeposit = parsedDeposit !== undefined
    ? (parsedDeposit ?? 0)
    : (current.data.deposit_amount ?? 0);
  const isPaidFinal = body.isPaid !== undefined ? body.isPaid : current.data.is_paid;
  patch.balance_amount = isPaidFinal ? 0 : Math.max(0, finalQuotation - finalDeposit);

  const updateRes = await supabase
    .from("repair_orders")
    .update(patch)
    .eq("id", params.id)
    .eq("store_id", storeId)
    .not("status", "in", "(completed,cancelled)")
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
