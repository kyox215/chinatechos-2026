import { randomUUID } from "crypto";
import { appendInventoryEvent } from "@/lib/data/inventory-events";
import { getInventoryItem } from "@/lib/data/inventory";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "inventory-docs";

export type InventoryAttachmentKind = "id_front" | "id_back" | "invoice" | "box" | "other";

export type InventoryAttachmentRow = {
  id: string;
  store_id: string;
  inventory_item_id: string;
  kind: InventoryAttachmentKind;
  storage_path: string;
  file_name: string | null;
  created_at: string;
};

export type InventoryAttachmentView = InventoryAttachmentRow & {
  signedUrl: string;
  /** Present when ID scans are hidden from this viewer role. */
  masked?: boolean;
};

const KIND_SET = new Set<string>(["id_front", "id_back", "invoice", "box", "other"]);

function canViewSensitiveInventoryAttachments(): boolean {
  return process.env.BACKOFFICE_INVENTORY_DOC_ROLE === "manager";
}

export function assertAttachmentKind(k: string): asserts k is InventoryAttachmentKind {
  if (!KIND_SET.has(k)) throw new Error("无效附件类型");
}

export async function listInventoryAttachmentsWithUrls(
  inventoryItemId: string,
): Promise<InventoryAttachmentView[]> {
  const storeId = await resolveStoreId();
  if (!storeId) return [];

  const item = await getInventoryItem(inventoryItemId);
  if (!item || item.store_id !== storeId) return [];

  const supabase = createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("inventory_attachments")
    .select("*")
    .eq("inventory_item_id", inventoryItemId)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const revealSensitive = canViewSensitiveInventoryAttachments();

  const out: InventoryAttachmentView[] = [];
  for (const r of rows ?? []) {
    const row = r as InventoryAttachmentRow;
    const sensitive = row.kind === "id_front" || row.kind === "id_back";
    if (sensitive && !revealSensitive) {
      out.push({
        ...row,
        signedUrl: "",
        masked: true,
      });
      continue;
    }

    const path = row.storage_path;
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    out.push({
      ...row,
      signedUrl: signed?.signedUrl ?? "",
    });
  }
  return out;
}

export async function uploadInventoryAttachment(input: {
  inventoryItemId: string;
  kind: InventoryAttachmentKind;
  fileName: string;
  contentType: string;
  body: Buffer;
}): Promise<{ id: string }> {
  const storeId = await resolveStoreId();
  if (!storeId) throw new Error("无法确定门店");

  const item = await getInventoryItem(input.inventoryItemId);
  if (!item || item.store_id !== storeId) throw new Error("记录不存在");

  const maxBytes = 10 * 1024 * 1024;
  if (input.body.length > maxBytes) throw new Error("文件过大（最大 10MB）");

  const ext =
    input.fileName.includes(".") ? input.fileName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin" : "bin";
  const safeExt = ext.slice(0, 8);
  const storagePath = `${storeId}/${input.inventoryItemId}/${randomUUID()}.${safeExt}`;

  const supabase = createSupabaseServerClient();
  const up = await supabase.storage.from(BUCKET).upload(storagePath, input.body, {
    contentType: input.contentType || "application/octet-stream",
    upsert: false,
  });
  if (up.error) throw new Error(up.error.message);

  const ins = await supabase
    .from("inventory_attachments")
    .insert({
      store_id: storeId,
      inventory_item_id: input.inventoryItemId,
      kind: input.kind,
      storage_path: storagePath,
      file_name: input.fileName.slice(0, 255) || null,
    })
    .select("id")
    .single();

  if (ins.error) throw new Error(ins.error.message);

  const id = ins.data!.id as string;

  await appendInventoryEvent({
    inventoryItemId: input.inventoryItemId,
    eventType: "attachment_added",
    payload: { kind: input.kind, storage_path: storagePath, file_name: input.fileName },
    operatorName: null,
  });

  return { id };
}
