"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postOrderTransition } from "@/lib/api/order-transition-client";

export function OrderTransitionButton(props: {
  orderId: string;
  toStatus: string;
  label: string;
  confirmText: string;
  reasonPrompt?: string;
  reasonField?: string;
  variant?: "danger";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const ok = window.confirm(props.confirmText);
    if (!ok) return;

    let reason = "";
    if (props.reasonPrompt && props.reasonField) {
      const input = window.prompt(props.reasonPrompt, "");
      if (input === null) return;
      reason = input.trim();
    }

    setPending(true);
    setError(null);
    try {
      await postOrderTransition(props.orderId, {
        toStatus: props.toStatus,
        ...(props.reasonField && reason ? { [props.reasonField]: reason } : {}),
      });

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  const btnClass =
    props.variant === "danger"
      ? "h-8 rounded-xl border border-status-danger bg-status-danger px-3 text-xs font-semibold text-status-danger-foreground disabled:cursor-not-allowed disabled:opacity-60"
      : "h-8 rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className={btnClass}
        disabled={pending}
        onClick={onClick}
        type="button"
      >
        {pending ? "处理中..." : props.label}
      </button>
      {error ? <div className="text-[11px] text-status-danger-foreground">{error}</div> : null}
    </div>
  );
}
