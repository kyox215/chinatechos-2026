"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  name: string | null;
  phoneE164: string;
  phoneRaw: string | null;
  consentRequiredNotify: boolean;
  consentMarketing: boolean;
  notes: string | null;
};

export function CustomerInfoCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.name ?? "");
  const [notes, setNotes] = useState(props.notes ?? "");
  const [consentNotify, setConsentNotify] = useState(props.consentRequiredNotify);
  const [consentMarketing, setConsentMarketing] = useState(props.consentMarketing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          notes: notes.trim() || null,
          consentRequiredNotify: consentNotify,
          consentMarketing,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm("确认删除该客户？此操作不可逆。")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${props.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "删除失败");
      router.push("/customers");
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">编辑客户信息</h2>
          <button className="text-xs text-neutral-500 hover:text-neutral-700" onClick={() => setEditing(false)} type="button">取消</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-0.5 block text-xs text-neutral-500">姓名</label>
            <input className="ui-input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="客户姓名" />
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-neutral-500">备注</label>
            <textarea className="ui-input min-h-[60px] w-full py-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="客户备注..." />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input checked={consentNotify} onChange={(e) => setConsentNotify(e.target.checked)} type="checkbox" className="h-4 w-4 rounded border-neutral-300" />
              通知许可
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input checked={consentMarketing} onChange={(e) => setConsentMarketing(e.target.checked)} type="checkbox" className="h-4 w-4 rounded border-neutral-300" />
              营销许可
            </label>
          </div>
          {error && <div className="text-xs text-rose-600">{error}</div>}
          <div className="flex gap-2 border-t border-border pt-3">
            <button className="ui-btn ui-btn-primary h-9 px-4 text-xs disabled:opacity-60" disabled={pending} onClick={handleSave} type="button">
              {pending ? "保存中..." : "保存"}
            </button>
            <button className="ui-btn ui-btn-secondary h-9 px-3 text-xs" onClick={() => setEditing(false)} type="button">取消</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">基本信息</h2>
        <div className="flex gap-2">
          <button className="text-xs text-indigo-600 hover:underline" onClick={() => setEditing(true)} type="button">编辑</button>
          <button className="text-xs text-rose-500 hover:underline disabled:opacity-60" disabled={deleting} onClick={handleDelete} type="button">
            {deleting ? "删除中..." : "删除"}
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <Row label="姓名" value={props.name ?? "-"} />
        <Row label="电话 (E.164)" value={props.phoneE164} />
        <Row label="电话 (原始)" value={props.phoneRaw ?? "-"} />
        <Row label="通知许可" value={props.consentRequiredNotify ? "是" : "否"} />
        <Row label="营销许可" value={props.consentMarketing ? "是" : "否"} />
        {props.notes && <Row label="备注" value={props.notes} />}
      </div>
      {error && <div className="mt-2 text-xs text-rose-600">{error}</div>}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-900">{value}</span>
    </div>
  );
}
