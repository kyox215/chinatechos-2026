import { NextRequest, NextResponse } from "next/server";
import { lookupInventoryScan } from "@/lib/data/inventory";

export async function POST(request: NextRequest) {
  let body: { raw?: string };
  try {
    body = (await request.json()) as { raw?: string };
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const raw = String(body.raw ?? "");
  try {
    const result = await lookupInventoryScan(raw);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "解析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
