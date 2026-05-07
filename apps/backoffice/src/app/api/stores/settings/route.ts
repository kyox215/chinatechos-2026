import { NextRequest, NextResponse } from "next/server";
import { validateOrderUiConfigFullSnapshot } from "@/lib/domain/order-ui-config";
import { getStoreSettings } from "@/lib/data/store-settings";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const settings = await getStoreSettings();
  if (!settings) {
    return NextResponse.json({ error: "无法加载门店设置" }, { status: 404 });
  }
  return NextResponse.json(settings);
}

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
    printPaper?: "A5" | "A4";
    printOrientation?: "landscape" | "portrait";
    printDensity?: "compact" | "normal" | "relaxed";
    printMarginMm?: 3 | 5 | 8;
    orderUiConfig?: unknown;
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
  if (body.printPaper !== undefined) {
    if (body.printPaper !== "A5" && body.printPaper !== "A4") {
      return NextResponse.json({ error: "打印纸张仅支持 A5/A4" }, { status: 400 });
    }
    patch.print_paper = body.printPaper;
  }
  if (body.printOrientation !== undefined) {
    if (body.printOrientation !== "landscape" && body.printOrientation !== "portrait") {
      return NextResponse.json({ error: "打印方向无效" }, { status: 400 });
    }
    patch.print_orientation = body.printOrientation;
  }
  if (body.printDensity !== undefined) {
    if (!["compact", "normal", "relaxed"].includes(body.printDensity)) {
      return NextResponse.json({ error: "打印密度无效" }, { status: 400 });
    }
    patch.print_density = body.printDensity;
  }
  if (body.printMarginMm !== undefined) {
    const val = Number(body.printMarginMm);
    if (![3, 5, 8].includes(val)) {
      return NextResponse.json({ error: "打印边距仅支持 3/5/8 mm" }, { status: 400 });
    }
    patch.print_margin_mm = val;
  }

  if (body.orderUiConfig !== undefined) {
    const validated = validateOrderUiConfigFullSnapshot(body.orderUiConfig);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.errors.join("；"), errors: validated.errors },
        { status: 422 },
      );
    }
    patch.order_ui_config = validated.value as unknown as Record<string, unknown>;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("stores")
    .update(patch)
    .eq("id", storeId)
    .select(
      "id, name, store_code, timezone, approval_overdue_hours, pickup_overdue_days, print_paper, print_orientation, print_density, print_margin_mm, order_ui_config",
    )
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result.data });
}
