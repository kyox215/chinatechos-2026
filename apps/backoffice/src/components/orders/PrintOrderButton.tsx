"use client";

import { OrderPrintSheet } from "@/components/orders/OrderPrintSheet";
import type { PrintOptions } from "@/lib/domain/print-mode";
import { triggerOrderSheetPrint } from "@/lib/domain/print-mode";
import type { OrderPrintPayload } from "@/lib/domain/order-print-it";

const ORDER_DETAIL_PRINT_SELECTOR = "#order-repair-print-sheet";

export function PrintOrderButton(props: {
  payload: OrderPrintPayload;
  defaultPrintOptions?: PrintOptions;
  label?: string;
  className?: string;
}) {
  const label = props.label ?? "打印";

  function handlePrint() {
    triggerOrderSheetPrint({
      ...props.defaultPrintOptions,
      sheetSelector: ORDER_DETAIL_PRINT_SELECTOR,
    });
  }

  return (
    <>
      <OrderPrintSheet payload={props.payload} />
      <button
        aria-label={`${label}（打开浏览器打印对话框）`}
        className={props.className ?? "ui-btn ui-btn-secondary h-9 px-3 text-xs"}
        onClick={handlePrint}
        type="button"
      >
        {label}
      </button>
    </>
  );
}
