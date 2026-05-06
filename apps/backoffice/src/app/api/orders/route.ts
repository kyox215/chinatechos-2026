import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/data/create-order";

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
  const quotationAmount = body.quotationAmount != null ? Number(body.quotationAmount) : undefined;
  const depositAmount = body.depositAmount != null ? Number(body.depositAmount) : undefined;
  const technicianName = String(body.technicianName ?? "");
  const internalTag = String(body.internalTag ?? "");
  if (!customerPhone.trim()) {
    return NextResponse.json({ error: "客户电话不能为空" }, { status: 400 });
  }
  if (!brand.trim()) {
    return NextResponse.json({ error: "设备品牌不能为空" }, { status: 400 });
  }
  if (!model.trim()) {
    return NextResponse.json({ error: "设备型号不能为空" }, { status: 400 });
  }
  if (!issueDescription.trim()) {
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
      issueDescription: issueDescription.trim(),
      quotationAmount: quotationAmount && !isNaN(quotationAmount) ? quotationAmount : undefined,
      depositAmount: depositAmount && !isNaN(depositAmount) ? depositAmount : undefined,
      technicianName: technicianName.trim() || undefined,
      internalTag: internalTag.trim() || undefined,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建工单失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
