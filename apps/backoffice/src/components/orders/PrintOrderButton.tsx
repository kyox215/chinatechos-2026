"use client";

import { OrderPrintSheet } from "@/components/orders/OrderPrintSheet";
import type { PrintOptions } from "@/lib/domain/print-mode";
import { triggerOrderSheetPrint } from "@/lib/domain/print-mode";
import type { OrderPrintPayload } from "@/lib/domain/order-print-it";

export function PrintOrderButton(props: {
  payload: OrderPrintPayload;
  defaultPrintOptions?: PrintOptions;
  label?: string;
  className?: string;
}) {
  const label = props.label ?? "Stampa";

  function handlePrint() {
    triggerOrderSheetPrint(props.defaultPrintOptions);
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
