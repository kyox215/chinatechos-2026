"use client";

import { useState } from "react";

export function WhatsAppButton({
  orderId,
  customerPhone,
}: {
  orderId: string;
  customerPhone: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!customerPhone) return null;

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/messages/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customBody: `Buongiorno, la contatto da ChinaTech riguardo il suo ordine di riparazione.`,
        }),
      });
      const data = (await res.json()) as { waLink?: string; messageLogId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "创建消息失败");
      if (data.waLink) {
        window.open(data.waLink, "_blank");
        if (data.messageLogId) {
          await fetch(`/api/message-logs/${data.messageLogId}/opened`, {
            method: "POST",
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        className="h-8 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        disabled={pending}
        onClick={handleClick}
        type="button"
      >
        {pending ? "..." : "WhatsApp"}
      </button>
      {error && <div className="mt-1 text-[11px] text-rose-600">{error}</div>}
    </div>
  );
}
