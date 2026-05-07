import { NextRequest, NextResponse } from "next/server";
import { createInventoryItem, listInventoryItems } from "@/lib/data/inventory";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const { items } = await listInventoryItems({ q, channel, status });
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "加载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const productChannel = String(body.productChannel ?? "");
  if (!["new_retail", "refurbished", "trade_in"].includes(productChannel)) {
    return NextResponse.json({ error: "无效渠道" }, { status: 400 });
  }

  const brand = String(body.brand ?? "");
  const model = String(body.model ?? "");
  if (!brand.trim() || !model.trim()) {
    return NextResponse.json({ error: "品牌与型号必填" }, { status: 400 });
  }

  const parseNum = (v: unknown) => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
  };

  try {
    const result = await createInventoryItem({
      productChannel: productChannel as "new_retail" | "refurbished" | "trade_in",
      brand: brand.trim(),
      model: model.trim(),
      imeiOrSerial: String(body.imeiOrSerial ?? "").trim() || undefined,
      sellerPhone: String(body.sellerPhone ?? "").trim() || undefined,
      sellerName: String(body.sellerName ?? "").trim() || undefined,
      purchaseCost: parseNum(body.purchaseCost),
      listPrice: parseNum(body.listPrice),
      notes: String(body.notes ?? "").trim() || undefined,
      sourceRepairOrderId: body.sourceRepairOrderId ? String(body.sourceRepairOrderId) : undefined,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
