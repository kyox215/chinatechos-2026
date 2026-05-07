"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STORE_NAME, STORE_ADDRESS } from "@/lib/domain/store-info";
import { buildWhatsAppLink } from "@/lib/domain/whatsapp";

type FaultItem = { label: string; price: number };

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  customerPhone: string;
  customerName: string | null;
  deviceLabel: string;
  faultItems: FaultItem[];
  total: number;
};

export function SendQuoteModal(props: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!props.open) return null;

  const salutation = props.customerName?.trim()
    ? `Gentile ${props.customerName.trim()},`
    : "Gentile Cliente,";

  const messageLines = [
    salutation,
    ``,
    `Con la presente Le trasmettiamo il preventivo dettagliato per l'intervento sul Suo ${props.deviceLabel}:`,
    ``,
    ...props.faultItems.filter((f) => f.price > 0).map((f) => `• ${f.label}: €${f.price.toFixed(2)}`),
    ``,
    `Importo totale: €${props.total.toFixed(2)}`,
    ``,
    `La preghiamo cortesemente di comunicarci se intende procedere con la riparazione.`,
    ``,
    `Cordiali saluti,`,
    STORE_NAME,
    STORE_ADDRESS,
  ];
  const messageText = messageLines.join("\n");
  const waLink = buildWhatsAppLink(props.customerPhone, messageText);

  async function handleSend() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      // Update quotation amount
      const updateRes = await fetch(`/api/orders/${props.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotation_amount: props.total }),
      });
      const updateData = (await updateRes.json()) as { error?: string };
      if (!updateRes.ok) throw new Error(updateData.error ?? "报价金额更新失败");

      // Transition to waiting_approval
      const res = await fetch(`/api/orders/${props.orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ toStatus: "waiting_approval" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "状态流转失败");

      // Record message log
      await fetch(`/api/orders/${props.orderId}/messages/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customBody: messageText }),
      });

      // Open WhatsApp
      window.open(waLink, "_blank");

      props.onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
    >
      <div className="flex max-h-[80dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-lg md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-neutral-900">发送报价给客户</h3>
          <button className="ui-btn ui-btn-secondary h-8 w-8 flex items-center justify-center text-xs" onClick={props.onClose} type="button">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="text-xs text-neutral-500">以下消息将通过 WhatsApp 发送给客户：</div>

          <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-neutral-700 whitespace-pre-line leading-relaxed">
            {messageText}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>发送至:</span>
            <span className="font-medium text-neutral-900">{props.customerPhone}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div>{error && <span className="text-xs text-rose-600">{error}</span>}</div>
          <div className="flex gap-2">
            <button className="ui-btn ui-btn-secondary h-9 px-3 text-xs" onClick={props.onClose} type="button">取消</button>
            <button
              className="ui-btn ui-btn-primary h-9 px-4 text-xs disabled:opacity-60"
              disabled={pending}
              onClick={handleSend}
              type="button"
            >
              {pending ? "处理中..." : "打开 WhatsApp 发送"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
