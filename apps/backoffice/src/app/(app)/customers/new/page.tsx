"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consentNotify, setConsentNotify] = useState(true);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!phone.trim()) {
      setError("电话号码不能为空");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim(),
          consentRequiredNotify: consentNotify,
          consentMarketing: consentMarketing,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string; existingId?: string };
      if (!res.ok) {
        if (data.existingId) {
          setError(`该电话已存在客户，点击查看`);
          return;
        }
        throw new Error(data.error ?? "创建失败");
      }
      router.push(`/customers/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-muted"
        >
          ← 返回
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">新建客户</h1>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm text-neutral-600">电话 (必填)</label>
          <input
            className="ui-input w-full"
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+39 333 1234567"
            value={phone}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">姓名</label>
          <input
            className="ui-input w-full"
            onChange={(e) => setName(e.target.value)}
            placeholder="客户姓名"
            value={name}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">备注</label>
          <textarea
            className="ui-input w-full min-h-[80px] py-2"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="客户备注..."
            value={notes}
          />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              checked={consentNotify}
              onChange={(e) => setConsentNotify(e.target.checked)}
              type="checkbox"
            />
            通知许可
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              checked={consentMarketing}
              onChange={(e) => setConsentMarketing(e.target.checked)}
              type="checkbox"
            />
            营销许可
          </label>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Link
            href="/customers"
            className="ui-btn ui-btn-secondary h-10 px-4 leading-10 md:h-9 md:leading-9"
          >
            取消
          </Link>
          <button
            className="ui-btn ui-btn-primary h-10 px-4 md:h-9 disabled:opacity-60"
            disabled={pending}
            onClick={handleSubmit}
            type="button"
          >
            {pending ? "创建中..." : "创建客户"}
          </button>
        </div>
      </div>
    </div>
  );
}
