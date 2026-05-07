"use client";

import { InventorySalePrintSheet } from "@/components/inventory/InventorySalePrintSheet";
import type { PrintOptions } from "@/lib/domain/print-mode";
import { triggerOrderSheetPrint } from "@/lib/domain/print-mode";
import type { InventorySalePrintPayload } from "@/lib/domain/inventory-print-it";

export function InventoryPrintButton(props: {
  payload: InventorySalePrintPayload;
  defaultPrintOptions?: PrintOptions;
  label?: string;
  className?: string;
}) {
  const label = props.label ?? "Stampa ricevuta";

  return (
    <>
      <InventorySalePrintSheet payload={props.payload} />
      <button
        className={props.className ?? "ui-btn ui-btn-secondary h-9 px-3 text-xs"}
        onClick={() => triggerOrderSheetPrint(props.defaultPrintOptions)}
        type="button"
      >
        {label}
      </button>
    </>
  );
}
