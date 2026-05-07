import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/data/create-order";

function parseNonNegativeNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  let body: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    body = (await request.json()) as Record<string, unknown>;
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries());
  }

  const orderType = String(body.orderType || "dropoff_repair");
  const customerPhone = String(body.customerPhone ?? "");
  const customerName = String(body.customerName ?? "");
  const brand = String(body.brand ?? "");
  const model = String(body.model ?? "");
  const serialOrImei = String(body.serialOrImei ?? "");
  const issueDescription = String(body.issueDescription ?? "");
  const quotationAmount = parseNonNegativeNumber(body.quotationAmount);
  const depositAmount = parseNonNegativeNumber(body.depositAmount);
  const technicianName = String(body.technicianName ?? "");
  const internalTag = String(body.internalTag ?? "");
  const warrantyText = String(body.warrantyText ?? "6个月");
  const originalOrderId = body.originalOrderId ? String(body.originalOrderId) : undefined;
  const initialStatus = body.initialStatus ? String(body.initialStatus) : undefined;
  const isRework = initialStatus === "rework";

  if (!customerPhone.trim()) {
    return NextResponse.json({ error: "客户电话不能为空" }, { status: 400 });
  }
  if (!brand.trim()) {
    return NextResponse.json({ error: "设备品牌不能为空" }, { status: 400 });
  }
  if (!model.trim()) {
    return NextResponse.json({ error: "设备型号不能为空" }, { status: 400 });
  }
  if (!isRework && !issueDescription.trim()) {
    return NextResponse.json({ error: "问题描述不能为空" }, { status: 400 });
  }

  try {
    const result = await createOrder({
      orderType: orderType as "quick_repair" | "dropoff_repair",
      customerPhone: customerPhone.trim(),
      customerName: customerName.trim() || undefined,
      brand: brand.trim(),
      model: model.trim(),
      serialOrImei: serialOrImei.trim() || undefined,
      issueDescription: issueDescription.trim() || (isRework ? "返修" : ""),
      quotationAmount,
      depositAmount,
      technicianName: technicianName.trim() || undefined,
      internalTag: internalTag.trim() || undefined,
      warrantyText: warrantyText.trim() || undefined,
      originalOrderId,
      initialStatus,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建工单失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
