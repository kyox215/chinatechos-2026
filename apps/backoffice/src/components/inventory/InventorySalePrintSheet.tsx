"use client";

import { STORE_ADDRESS, STORE_NAME } from "@/lib/domain/store-info";
import {
  type InventorySalePrintPayload,
  formatEURPrint,
  formatPrintDate,
} from "@/lib/domain/inventory-print-it";

function Row(props: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[8px] leading-tight">
      <span className="text-neutral-600">{props.label}</span>
      <span className="text-right font-medium text-neutral-900">{props.value}</span>
    </div>
  );
}

export function InventorySalePrintSheet(props: { payload: InventorySalePrintPayload }) {
  const p = props.payload;
  return (
    <div className="order-print-sheet">
      <article className="w-full border border-neutral-300 p-2 text-[8.5px] leading-tight text-neutral-900 print:border-neutral-300">
        <header className="border-b border-neutral-300 pb-1">
          <div className="text-[11px] font-bold">{STORE_NAME}</div>
          <div className="text-[7.5px] text-neutral-700">{STORE_ADDRESS}</div>
          <h1 className="mt-1 text-[10px] font-semibold uppercase tracking-wide">Ricevuta vendita dispositivo</h1>
          <p className="text-[7.5px] text-neutral-600">Documento per il cliente</p>
        </header>
        <section className="mt-2 space-y-0.5">
          <Row label="Numero inventario" value={p.publicNo || "—"} />
          <Row label="Data/ora" value={formatPrintDate(p.printedAtIso)} />
          <Row label="Tipo" value={p.productChannelLabel} />
          <Row label="Marca / Modello" value={`${p.brand} ${p.model}`.trim()} />
          <Row label="IMEI / SN" value={p.imeiOrSerial?.trim() || "—"} />
        </section>
        <section className="mt-2 border-t border-neutral-200 pt-1">
          <h2 className="mb-0.5 text-[9px] font-semibold">Importi (EUR)</h2>
          <Row label="Prezzo listino" value={formatEURPrint(p.listPriceEur)} />
          <Row label="Prezzo vendita" value={formatEURPrint(p.soldPriceEur)} />
        </section>
        {p.conditionSummaryIt?.trim() ? (
          <section className="mt-2 border-t border-neutral-200 pt-1">
            <h2 className="mb-0.5 text-[9px] font-semibold">Difetti / Condizioni dichiarate</h2>
            <p className="whitespace-pre-wrap text-[8px] text-neutral-800">{p.conditionSummaryIt.trim()}</p>
          </section>
        ) : null}
        <p className="mt-2 text-[7.5px] text-neutral-500">Conservare questa ricevuta. I difetti indicati sono stati accettati al momento della vendita.</p>
      </article>
    </div>
  );
}
