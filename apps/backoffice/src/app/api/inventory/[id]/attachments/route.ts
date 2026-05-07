import { NextRequest, NextResponse } from "next/server";
import {
  assertAttachmentKind,
  listInventoryAttachmentsWithUrls,
  uploadInventoryAttachment,
} from "@/lib/data/inventory-attachments";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const items = await listInventoryAttachmentsWithUrls(id);
    return NextResponse.json({ attachments: items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "加载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无效表单" }, { status: 400 });
  }

  const kindRaw = String(formData.get("kind") ?? "");
  try {
    assertAttachmentKind(kindRaw);
  } catch {
    return NextResponse.json({ error: "无效附件类型" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  const fileName = "name" in file && typeof file.name === "string" ? file.name : "upload.bin";
  const contentType = file.type || "application/octet-stream";

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await uploadInventoryAttachment({
      inventoryItemId: id,
      kind: kindRaw,
      fileName,
      contentType,
      body: buf,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
