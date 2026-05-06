"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderTransitionButton(props: {
  orderId: string;
  toStatus: string;
  label: string;
  confirmText: string;
  reasonPrompt?: string;
  reasonField?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const ok = window.confirm(props.confirmText);
    if (!ok) return;

    let reason = "";
    if (props.reasonPrompt && props.reasonField) {
      const input = window.prompt(props.reasonPrompt, "客户拒绝报价");
      if (input === null) return;
      reason = input.trim();
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          toStatus: props.toStatus,
          operatorName: "frontdesk",
          ...(props.reasonField ? { [props.reasonField]: reason } : {}),
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "状态流转失败");
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="h-8 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        onClick={onClick}
        type="button"
      >
        {pending ? "处理中..." : props.label}
      </button>
      {error ? <div className="text-[11px] text-rose-600">{error}</div> : null}
    </div>
  );
}
