"use client";

import { useState } from "react";
import { STORE_NAME, STORE_ADDRESS } from "@/lib/domain/store-info";

type Props = {
  orderId: string;
  customerPhone: string;
  status?: string;
  customerName?: string | null;
  deviceLabel?: string;
  issueDescription?: string;
  quotationAmount?: number | null;
};

function buildStatusMessage(props: Props): string {
  const name = props.customerName ?? "Cliente";
  const device = props.deviceLabel || "dispositivo";
  const faults = props.issueDescription || "";
  const quote = props.quotationAmount;

  switch (props.status) {
    case "new":
    case "diagnosing":
      return `Buongiorno ${name}, il suo ${device} è stato preso in carico.${faults ? ` Problemi riscontrati: ${faults}.` : ""} La contatteremo appena avremo il preventivo. Grazie, ${STORE_NAME}`;
    case "quoted":
    case "waiting_approval":
      return `Buongiorno ${name}, ecco il risultato della diagnosi per il suo ${device}.${faults ? ` Problemi: ${faults}.` : ""}${quote ? ` Preventivo: €${quote.toFixed(2)}.` : ""} Ci confermi se procedere con la riparazione? Grazie, ${STORE_NAME}`;
    case "parts_ordered":
      return `Buongiorno ${name}, i ricambi per il suo ${device} sono stati ordinati. La avviseremo quando saranno arrivati. Grazie, ${STORE_NAME}`;
    case "parts_arrived":
      return `Buongiorno ${name}, i ricambi per il suo ${device} sono arrivati. Procederemo con la riparazione a breve. Grazie, ${STORE_NAME}`;
    case "repaired":
      return `Buongiorno ${name}, la riparazione del suo ${device} è completata! Può passare a ritirarlo presso ${STORE_ADDRESS}. Grazie, ${STORE_NAME}`;
    case "notified":
      return `Buongiorno ${name}, le ricordiamo che il suo ${device} è pronto per il ritiro presso ${STORE_ADDRESS}. Grazie, ${STORE_NAME}`;
    default:
      return `Buongiorno ${name}, la contatto da ${STORE_NAME} riguardo il suo ordine di riparazione.`;
  }
}

export function WhatsAppButton(props: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!props.customerPhone) return null;

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const message = buildStatusMessage(props);
      const res = await fetch(`/api/orders/${props.orderId}/messages/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customBody: message }),
      });
      const data = (await res.json()) as { waLink?: string; messageLogId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "创建消息失败");
      if (data.waLink) {
        window.open(data.waLink, "_blank");
        if (data.messageLogId) {
          await fetch(`/api/message-logs/${data.messageLogId}/opened`, { method: "POST" });
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
