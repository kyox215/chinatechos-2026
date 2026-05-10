"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeliverButton({ orderId, deliveredAt }: { orderId: string; deliveredAt: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (deliveredAt) {
    return (
      <div className="text-xs text-status-success-foreground">
        ✓ 已交付 ({new Intl.DateTimeFormat("it-IT", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(deliveredAt))})
      </div>
    );
  }

  async function handleDeliver() {
    const ok = window.confirm("确认已交付给客户？");
    if (!ok) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "交付失败");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        className="h-8 rounded-xl border border-status-success bg-status-success px-3 text-xs font-semibold text-status-success-foreground disabled:opacity-60"
        disabled={pending}
        onClick={handleDeliver}
        type="button"
      >
        {pending ? "处理中..." : "确认交付"}
      </button>
      {error && <div className="mt-1 text-[11px] text-status-danger-foreground">{error}</div>}
    </div>
  );
}
