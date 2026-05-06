"use client";

import { OrderPrintSheet } from "@/components/orders/OrderPrintSheet";
import type { OrderPrintPayload } from "@/lib/domain/order-print-it";

export function PrintOrderButton(props: {
  payload: OrderPrintPayload;
  label?: string;
  className?: string;
}) {
  const label = props.label ?? "打印";

  function handlePrint() {
    requestAnimationFrame(() => window.print());
  }

  return (
    <>
      <OrderPrintSheet payload={props.payload} />
      <button
        className={props.className ?? "ui-btn ui-btn-secondary h-9 px-3 text-xs"}
        onClick={handlePrint}
        type="button"
      >
        {label}
      </button>
    </>
  );
}
