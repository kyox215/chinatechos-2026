import { NextRequest, NextResponse } from "next/server";
import { writeOrderEvent } from "@/lib/data/order-events";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const EDITABLE_FIELDS = [
  "diagnosis_result",
  "quotation_amount",
  "deposit_amount",
  "balance_amount",
  "technician_name",
  "internal_tag",
  "warranty_text",
  "pause_reason",
  "issue_description",
] as const;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店，请配置 DEFAULT_STORE_ID" }, { status: 500 });
  }

  const params = await context.params;
  const body = (await request.json()) as Record<string, unknown>;

  const supabase = createSupabaseServerClient();

  const current = await supabase
    .from("repair_orders")
    .select("id, status")
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();

  if (current.error || !current.data) {
    return NextResponse.json({ error: "工单不存在或无权限" }, { status: 404 });
  }

  if (current.data.status === "completed" || current.data.status === "cancelled") {
    return NextResponse.json({ error: "已完成或已取消的工单不可编辑" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      patch[field] = body[field] ?? null;
    }
  }

  if (Object.keys(patch).length <= 1) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const updateRes = await supabase
    .from("repair_orders")
    .update(patch)
    .eq("id", params.id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .select("id, status")
    .single();

  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  await writeOrderEvent({
    storeId,
    orderId: params.id,
    eventType: "fields_updated",
    payload: { fields: Object.keys(patch).filter((k) => k !== "updated_at") },
    operatorName: String(body.operatorName ?? "frontdesk"),
  });

  return NextResponse.json({ ok: true, id: params.id });
}
