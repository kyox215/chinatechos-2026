"use client";

import { useState } from "react";
import { STORE_NAME, STORE_ADDRESS } from "@/lib/domain/store-info";
import { issueSummaryForPrintIt } from "@/lib/domain/fault-print-it";
import { OrderWhatsAppSendModal } from "@/components/orders/OrderWhatsAppSendModal";

type Props = {
  orderId: string;
  customerPhone: string;
  contactPhones?: string[];
  status?: string;
  customerName?: string | null;
  deviceLabel?: string;
  issueDescription?: string;
  quotationAmount?: number | null;
};

export function buildStatusMessage(props: Props): string {
  const name = props.customerName ?? "Cliente";
  const device = props.deviceLabel || "dispositivo";
  const rawIssue = props.issueDescription || "";
  const faults = rawIssue
    ? issueSummaryForPrintIt(rawIssue).summaryIt
    : "";
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
  const [open, setOpen] = useState(false);

  if (!props.customerPhone) return null;
  const message = buildStatusMessage(props);
  const phones = (props.contactPhones && props.contactPhones.length > 0)
    ? props.contactPhones
    : [props.customerPhone];

  return (
    <div>
      <button
        className="h-8 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        onClick={() => setOpen(true)}
        type="button"
      >
        WhatsApp
      </button>
      <OrderWhatsAppSendModal
        open={open}
        onClose={() => setOpen(false)}
        orderId={props.orderId}
        messageText={message}
        initialPhones={phones}
        title="发送 WhatsApp 给客户"
      />
    </div>
  );
}
