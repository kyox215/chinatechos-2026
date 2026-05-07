import { NextRequest, NextResponse } from "next/server";
import { appendInventoryEvent } from "@/lib/data/inventory-events";
import { getInventoryItem } from "@/lib/data/inventory";
import { TRADE_IN_AGREEMENT_LEGAL_VERSION } from "@/lib/domain/inventory-print-it";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: { template?: string };
  try {
    body = (await request.json()) as { template?: string };
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const template = String(body.template ?? "");
  if (template !== "trade_in_agreement") {
    return NextResponse.json({ error: "无效模板" }, { status: 400 });
  }

  const row = await getInventoryItem(id);
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });

  try {
    await appendInventoryEvent({
      inventoryItemId: id,
      eventType: "print_trade_in_agreement",
      payload: { template, legal_template_version: TRADE_IN_AGREEMENT_LEGAL_VERSION },
      operatorName: null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "记录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
