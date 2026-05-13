"use client";

import Link from "next/link";
import { useState } from "react";
import { CreateOrderModal } from "@/components/orders/CreateOrderModal";
import { STORE_NAME } from "@/lib/domain/store-info";
import { buildWhatsAppLink } from "@/lib/domain/whatsapp";

type Props = {
  customerId: string;
  customerPhone: string;
  customerName: string | null;
};

export function CustomerActions({ customerId, customerPhone, customerName }: Props) {
  const [showCreateOrder, setShowCreateOrder] = useState(false);

  const waLink = buildWhatsAppLink(
    customerPhone,
    `Buongiorno ${customerName ?? "Cliente"}, la contatto da ${STORE_NAME}.`,
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          className="h-9 rounded-xl px-4 text-xs font-semibold text-primary-foreground hover:opacity-90"
          onClick={() => setShowCreateOrder(true)}
          style={{ background: "var(--gradient-brand)" }}
          type="button"
        >
          新建工单
        </button>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 rounded-xl bg-status-success-foreground px-4 text-xs font-semibold text-card leading-9 hover:opacity-90"
        >
          WhatsApp
        </a>
        <Link
          href={`/orders?q=${encodeURIComponent(customerPhone)}`}
          className="h-9 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-foreground leading-9 hover:bg-muted"
        >
          查看全部工单
        </Link>
      </div>

      <CreateOrderModal
        open={showCreateOrder}
        onClose={() => setShowCreateOrder(false)}
        initialPhone={customerPhone}
        initialName={customerName ?? undefined}
      />
    </>
  );
}
