import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const body = (await request.json()) as {
    name?: string;
    storeCode?: string;
    timezone?: string;
    approvalOverdueHours?: number;
    pickupOverdueDays?: number;
  };

  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.storeCode !== undefined) patch.store_code = body.storeCode.trim();
  if (body.timezone !== undefined) patch.timezone = body.timezone.trim();
  if (body.approvalOverdueHours !== undefined) {
    const val = Number(body.approvalOverdueHours);
    if (isNaN(val) || val < 1) {
      return NextResponse.json({ error: "报价提醒小时数必须 >= 1" }, { status: 400 });
    }
    patch.approval_overdue_hours = val;
  }
  if (body.pickupOverdueDays !== undefined) {
    const val = Number(body.pickupOverdueDays);
    if (isNaN(val) || val < 1) {
      return NextResponse.json({ error: "未取件提醒天数必须 >= 1" }, { status: 400 });
    }
    patch.pickup_overdue_days = val;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("stores")
    .update(patch)
    .eq("id", storeId)
    .select("id, name, store_code, timezone, approval_overdue_hours, pickup_overdue_days")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result.data });
}
