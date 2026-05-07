"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  orderId: string;
  quotationAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  isPaid: boolean;
  isEditable: boolean;
};

export function PaymentCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deposit, setDeposit] = useState(String(props.depositAmount ?? ""));
  const [isPaid, setIsPaid] = useState(props.isPaid);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositAmount: deposit ? Number(deposit) : null,
          isPaid,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "更新失败");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">付款信息</h2>
        {props.isEditable && !editing && (
          <button
            className="text-xs text-indigo-600 hover:underline"
            onClick={() => setEditing(true)}
            type="button"
          >
            编辑
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <label className="w-16 text-neutral-500">押金</label>
            <input
              className="ui-input flex-1"
              onChange={(e) => setDeposit(e.target.value)}
              type="number"
              value={deposit}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-neutral-500">余额（自动）</span>
            <span className="font-medium tabular-nums text-neutral-900">
              {formatEUR(Math.max(0, (props.quotationAmount ?? 0) - (Number(deposit) || 0)))}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="w-16 text-neutral-500">结清</label>
            <input
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              type="checkbox"
            />
            <span className="text-xs text-neutral-600">{isPaid ? "已结清" : "未结清"}</span>
          </div>
          {error && <div className="text-xs text-rose-600">{error}</div>}
          <div className="flex gap-2">
            <button
              className="ui-btn ui-btn-primary h-8 px-3 text-xs"
              disabled={pending}
              onClick={save}
              type="button"
            >
              {pending ? "保存中..." : "保存"}
            </button>
            <button
              className="ui-btn ui-btn-secondary h-8 px-3 text-xs"
              onClick={() => setEditing(false)}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Row label="报价" value={formatEUR(props.quotationAmount)} />
          <Row label="押金" value={formatEUR(props.depositAmount)} />
          <Row label="余额" value={formatEUR(props.balanceAmount)} />
          <Row
            label="结清"
            value={props.isPaid ? "✓ 已结清" : "✗ 未结清"}
            highlight={!props.isPaid && props.quotationAmount != null}
          />
        </div>
      )}
    </section>
  );
}

function Row(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-neutral-500">{props.label}</span>
      <span className={props.highlight ? "font-medium text-rose-600" : "text-neutral-900"}>
        {props.value}
      </span>
    </div>
  );
}

function formatEUR(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}
