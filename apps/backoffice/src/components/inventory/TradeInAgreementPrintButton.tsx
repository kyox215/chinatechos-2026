"use client";

import { TradeInAgreementPrintSheet } from "@/components/inventory/TradeInAgreementPrintSheet";
import type { TradeInAgreementPrintPayload } from "@/lib/domain/inventory-print-it";
import { triggerOrderSheetPrint } from "@/lib/domain/print-mode";

export function TradeInAgreementPrintButton(props: {
  inventoryId: string;
  payload: TradeInAgreementPrintPayload;
  label?: string;
  className?: string;
}) {
  const label = props.label ?? "Stampa accordo permuta";

  return (
    <>
      <TradeInAgreementPrintSheet payload={props.payload} />
      <button
        className={props.className ?? "ui-btn ui-btn-secondary h-9 px-3 text-xs"}
        onClick={() => void onPrint(props.inventoryId)}
        type="button"
      >
        {label}
      </button>
    </>
  );
}

async function onPrint(inventoryId: string) {
  try {
    await fetch(`/api/inventory/${inventoryId}/print-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: "trade_in_agreement" }),
    });
  } catch {
    /* proceed to print even if logging fails */
  }
  triggerOrderSheetPrint({ sheetSelector: "#inventory-trade-in-print-sheet" });
}
