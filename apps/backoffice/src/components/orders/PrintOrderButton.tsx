"use client";

import { useState } from "react";
import { OrderPrintSheet } from "@/components/orders/OrderPrintSheet";
import type { PrintDensity, PrintOptions, PrintOrientation, PrintPaper } from "@/lib/domain/print-mode";
import { triggerOrderSheetPrint } from "@/lib/domain/print-mode";
import type { OrderPrintPayload } from "@/lib/domain/order-print-it";

export function PrintOrderButton(props: {
  payload: OrderPrintPayload;
  label?: string;
  className?: string;
}) {
  const label = props.label ?? "Stampa";
  const [open, setOpen] = useState(false);
  const [paperSize, setPaperSize] = useState<PrintPaper>("A5");
  const [orientation, setOrientation] = useState<PrintOrientation>("landscape");
  const [density, setDensity] = useState<PrintDensity>("normal");
  const [marginMm, setMarginMm] = useState<3 | 5 | 8>(5);

  function handlePrintNow() {
    const printOptions: PrintOptions = {
      paperSize,
      orientation,
      density,
      marginMm,
    };
    triggerOrderSheetPrint(printOptions);
    setOpen(false);
  }

  return (
    <>
      <OrderPrintSheet payload={props.payload} />
      <button
        className={props.className ?? "ui-btn ui-btn-secondary h-9 px-3 text-xs"}
        onClick={() => setOpen(true)}
        type="button"
      >
        {label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full rounded-t-2xl border border-border bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">Opzioni di stampa</h3>
            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between gap-3">
                <span className="text-neutral-600">Formato carta</span>
                <select
                  className="ui-input h-8 w-32"
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as PrintPaper)}
                >
                  <option value="A5">A5</option>
                  <option value="A4">A4</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-neutral-600">Orientamento</span>
                <select
                  className="ui-input h-8 w-32"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as PrintOrientation)}
                >
                  <option value="landscape">Orizzontale</option>
                  <option value="portrait">Verticale</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-neutral-600">Densità</span>
                <select
                  className="ui-input h-8 w-32"
                  value={density}
                  onChange={(e) => setDensity(e.target.value as PrintDensity)}
                >
                  <option value="compact">Compatta</option>
                  <option value="normal">Standard</option>
                  <option value="relaxed">Comoda</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-neutral-600">Margine</span>
                <select
                  className="ui-input h-8 w-32"
                  value={String(marginMm)}
                  onChange={(e) => setMarginMm(Number(e.target.value) as 3 | 5 | 8)}
                >
                  <option value="3">3 mm</option>
                  <option value="5">5 mm</option>
                  <option value="8">8 mm</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="ui-btn ui-btn-secondary h-9 px-3 text-xs"
                onClick={() => setOpen(false)}
                type="button"
              >
                Annulla
              </button>
              <button
                className="ui-btn ui-btn-primary h-9 px-4 text-xs"
                onClick={handlePrintNow}
                type="button"
              >
                Stampa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
