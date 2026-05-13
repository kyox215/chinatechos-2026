"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postOrderTransition } from "@/lib/api/order-transition-client";
import { STORE_NAME, STORE_ADDRESS } from "@/lib/domain/store-info";
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
  const [error, setError] = useState<string | null>(null);

  const messageMap: Record<string, string> = {
    repaired: `Buongiorno ${props.customerName ?? "Cliente"}, la informiamo che la riparazione del suo ${props.deviceLabel} è stata completata. Può passare a ritirarlo presso ${STORE_ADDRESS}. Grazie, ${STORE_NAME}`,
    parts_arrived: `Buongiorno ${props.customerName ?? "Cliente"}, le comunichiamo che i ricambi per il suo ${props.deviceLabel} sono arrivati. Procederemo con la riparazione. Grazie, ${STORE_NAME}`,
  };

  const message = messageMap[props.status];
  if (!message) return null;

  const waLink = buildWhatsAppLink(props.customerPhone, message);

  async function handleNotify() {
    setPending(true);
    setError(null);
    try {
      window.open(waLink, "_blank");

      const draftRes = await fetch(`/api/orders/${props.orderId}/messages/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ customBody: message }),
      });
      const draftData = (await draftRes.json().catch(() => ({}))) as { error?: string };
      if (!draftRes.ok) {
        throw new Error(draftData.error ?? "消息草稿保存失败");
      }

      if (props.status === "repaired") {
        await postOrderTransition(props.orderId, { toStatus: "notified" });
      }

      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "通知流程失败";
      setError(msg);
      console.error("[NotifyCustomerButton]", e);
    } finally {
      setPending(false);
    }
  }

  const label = props.status === "repaired" ? "通知客户取件" : "通知客户配件到货";

  return (
    <div className="flex w-full flex-col gap-1 md:w-auto">
      <button
        className="ui-btn ui-btn-primary h-9 w-full px-4 text-xs md:h-8 md:w-auto"
        disabled={pending}
        onClick={() => void handleNotify()}
        type="button"
      >
        {pending ? "发送中..." : label}
      </button>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
