"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildWhatsAppLink } from "@/lib/domain/whatsapp";

type Props = {
  orderId: string;
  status: string;
  customerPhone: string;
  customerName: string | null;
  deviceLabel: string;
};

export function NotifyCustomerButton(props: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const messageMap: Record<string, string> = {
    repaired: `Buongiorno ${props.customerName ?? "Cliente"}, la informiamo che la riparazione del suo ${props.deviceLabel} è stata completata. Può passare a ritirarlo. Grazie, ChinaTech Roma`,
    parts_arrived: `Buongiorno ${props.customerName ?? "Cliente"}, le comunichiamo che i ricambi per il suo ${props.deviceLabel} sono arrivati. Procederemo con la riparazione. Grazie, ChinaTech Roma`,
  };

  const message = messageMap[props.status];
  if (!message) return null;

  const waLink = buildWhatsAppLink(props.customerPhone, message);

  async function handleNotify() {
    setPending(true);
    try {
      // Open WhatsApp
      window.open(waLink, "_blank");

      // Record message
      await fetch(`/api/orders/${props.orderId}/messages/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customBody: message }),
      });

      // Auto-transition repaired → notified
      if (props.status === "repaired") {
        await fetch(`/api/orders/${props.orderId}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ toStatus: "notified" }),
        });
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const label = props.status === "repaired" ? "通知客户取件" : "通知客户配件到货";

  return (
    <button
      className="ui-btn ui-btn-primary h-9 w-full px-4 text-xs md:h-8 md:w-auto"
      disabled={pending}
      onClick={handleNotify}
      type="button"
    >
      {pending ? "发送中..." : label}
    </button>
  );
}
