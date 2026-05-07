import { NextRequest, NextResponse } from "next/server";
import { getInventoryItem, patchInventoryItem } from "@/lib/data/inventory";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const item = await getInventoryItem(id);
    if (!item) return NextResponse.json({ error: "未找到" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    const message = e instanceof Error ? e.message : "加载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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

  try {
    const qaReport =
      body.qaReport !== undefined && typeof body.qaReport === "object" && body.qaReport !== null
        ? (body.qaReport as Record<string, unknown>)
        : undefined;

    let qaCompletedAt: string | null | undefined;
    if (body.qaCompleted === true) qaCompletedAt = new Date().toISOString();
    else if (body.qaCompleted === false) qaCompletedAt = null;
    else qaCompletedAt = undefined;

    let listPrice: number | null | undefined = undefined;
    if (body.listPrice !== undefined) {
      if (body.listPrice === null || body.listPrice === "") listPrice = null;
      else {
        const n = Number(body.listPrice);
        if (!Number.isFinite(n)) {
          return NextResponse.json({ error: "标价无效" }, { status: 400 });
        }
        listPrice = n;
      }
    }

    await patchInventoryItem(id, {
      imeiCheckDone: body.imeiCheckDone !== undefined ? Boolean(body.imeiCheckDone) : undefined,
      imeiCheckNote:
        body.imeiCheckNote !== undefined ? (body.imeiCheckNote ? String(body.imeiCheckNote) : null) : undefined,
      qaReport,
      qaCompletedAt,
      notes: body.notes !== undefined ? String(body.notes ?? "").trim() || null : undefined,
      listPrice,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
