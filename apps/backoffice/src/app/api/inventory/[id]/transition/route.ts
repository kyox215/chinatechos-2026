import { NextRequest, NextResponse } from "next/server";
import { transitionInventoryItem } from "@/lib/data/inventory";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const to = String(body.to ?? "");
  if (!["reserved", "sold", "cancelled"].includes(to)) {
    return NextResponse.json({ error: "无效目标状态" }, { status: 400 });
  }

  const parseNum = (v: unknown) => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
  };

  try {
    await transitionInventoryItem(id, to as "reserved" | "sold" | "cancelled", {
      buyerPhone: String(body.buyerPhone ?? "").trim() || undefined,
      buyerName: String(body.buyerName ?? "").trim() || undefined,
      soldPrice: parseNum(body.soldPrice),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "状态变更失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
