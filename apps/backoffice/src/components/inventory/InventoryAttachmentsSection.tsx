"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type InventoryAttachmentClientVm = {
  id: string;
  kind: string;
  signedUrl: string;
  file_name: string | null;
  created_at: string;
  masked?: boolean;
};

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "id_front", label: "证件正面" },
  { value: "id_back", label: "证件反面" },
  { value: "invoice", label: "发票 / 票据" },
  { value: "box", label: "包装 / 附件" },
  { value: "other", label: "其他" },
];

function kindLabel(kind: string): string {
  return KIND_OPTIONS.find((k) => k.value === kind)?.label ?? kind;
}

function looksLikeImage(fileName: string | null): boolean {
  if (!fileName) return true;
  return /\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(fileName);
}

export function InventoryAttachmentsSection(props: {
  inventoryId: string;
  attachments: InventoryAttachmentClientVm[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState("invoice");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError("请选择文件");
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch(`/api/inventory/${props.inventoryId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "上传失败");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
      <h2 className="mb-3 text-sm font-semibold">附件</h2>
      <p className="mb-3 text-xs text-neutral-500">
        回收合规凭证（证件默认仅店长账号可预览完整图像）。单文件最大 10MB。
      </p>

      <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={(e) => void onSubmit(e)}>
        <div className="min-w-[140px] flex-1">
          <label className="mb-0.5 block text-[11px] text-neutral-400">类型</label>
          <select
            className="ui-input h-10 w-full md:h-9"
            disabled={busy}
            onChange={(e) => setKind(e.target.value)}
            value={kind}
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-[2]">
          <label className="mb-0.5 block text-[11px] text-neutral-400">文件</label>
          <input
            accept="image/*,.pdf,application/pdf"
            className="block w-full text-xs file:mr-2 file:rounded-lg file:border file:border-border file:bg-surface-2 file:px-2 file:py-1"
            disabled={busy}
            name="file"
            type="file"
          />
        </div>
        <button className="ui-btn ui-btn-secondary h-10 shrink-0 px-4 text-xs md:h-9" disabled={busy} type="submit">
          {busy ? "上传中…" : "上传"}
        </button>
      </form>

      {error ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">{error}</div> : null}

      {props.attachments.length === 0 ? (
        <div className="py-2 text-sm text-neutral-500">暂无附件</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {props.attachments.map((a) => (
            <li className="rounded-xl border border-border bg-surface-2 p-3" key={a.id}>
              <div className="text-xs font-medium text-neutral-700">{kindLabel(a.kind)}</div>
              <div className="mt-0.5 text-[11px] text-neutral-500">{a.file_name ?? "—"}</div>
              <div className="mt-0.5 text-[11px] text-neutral-400">
                {new Intl.DateTimeFormat("it-IT", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Rome",
                }).format(new Date(a.created_at))}
              </div>
              {a.masked ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-4 text-center text-xs text-amber-900">
                  证件类附件已上传；当前操作角色不可预览图像（需设置环境变量{" "}
                  <code className="rounded bg-white px-1">BACKOFFICE_INVENTORY_DOC_ROLE=manager</code>）。
                </div>
              ) : a.signedUrl && looksLikeImage(a.file_name) ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                <img
                  alt=""
                  className="mt-2 max-h-48 w-full rounded-lg border border-border object-contain"
                  src={a.signedUrl}
                />
              ) : a.signedUrl ? (
                <a
                  className="mt-2 inline-block text-xs font-medium text-primary underline"
                  href={a.signedUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  打开文件
                </a>
              ) : (
                <div className="mt-2 text-xs text-neutral-500">链接不可用</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
