"use client";

import { STORE_ADDRESS, STORE_NAME } from "@/lib/domain/store-info";
import {
  type OrderPrintPayload,
  WARRANTY_TERMS_IT,
  formatEURPrint,
  formatPrintDate,
  mapWarrantyCnToIt,
  translateAccessoryTagsToIt,
} from "@/lib/domain/order-print-it";

export function OrderPrintSheet(props: { payload: OrderPrintPayload }) {
  const p = props.payload;
  const title =
    p.variant === "draft"
      ? "Bozza ordine di riparazione"
      : "Ricevuta ordine di riparazione";

  return (
    <div className="order-print-sheet hidden print:block">
      <article className="mx-auto max-w-[148mm] text-[11px] leading-snug text-neutral-900 print:max-w-none print:text-[10px] print:leading-tight">
        <header className="border-b border-neutral-300 pb-2 print:pb-1.5">
          <div className="text-base font-bold print:text-sm">{STORE_NAME}</div>
          <div className="text-neutral-700">{STORE_ADDRESS}</div>
          <h1 className="mt-2 text-sm font-semibold uppercase tracking-wide print:mt-1.5 print:text-xs">{title}</h1>
          <p className="text-neutral-600">Documento per il cliente</p>
        </header>

        <section className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 print:mt-1.5">
          <Row label="Numero ordine" value={p.publicNo?.trim() || "— (bozza)"} />
          <Row label="Data" value={formatPrintDate(p.printedAtIso)} />
          <Row label="Cliente" value={p.customerName?.trim() || "—"} />
          <Row label="Telefono" value={p.customerPhone || "—"} />
        </section>

        <section className="mt-2 border-t border-neutral-200 pt-1.5 print:mt-1.5 print:pt-1">
          <h2 className="mb-0.5 font-semibold">Dispositivo</h2>
          <Row label="Marca" value={p.brand} />
          <Row label="Modello" value={p.model} />
          <Row label="IMEI / Seriale" value={p.serialOrImei?.trim() || "—"} />
        </section>

        <section className="mt-2 border-t border-neutral-200 pt-1.5 print:mt-1.5 print:pt-1">
          <h2 className="mb-0.5 font-semibold">Intervento richiesto</h2>
          {p.faultPriceLines && p.faultPriceLines.length > 0 ? (
            <table className="mt-0.5 w-full border-collapse text-[10px] print:text-[9px]">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-600">
                  <th className="py-0.5 pr-2 font-medium">Descrizione</th>
                  <th className="py-0.5 font-medium">Importo</th>
                </tr>
              </thead>
              <tbody>
                {p.faultPriceLines.map((row, i) => (
                  <tr key={`${row.labelIt}-${i}`} className="border-b border-neutral-100">
                    <td className="py-0.5 pr-2 align-top text-neutral-800">{row.labelIt}</td>
                    <td className="py-0.5 whitespace-nowrap align-top tabular-nums text-neutral-800">
                      {formatEURPrint(row.amountEur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {p.faultPriceLines && p.faultPriceLines.length > 0 ? (
            p.interventionFreeNote?.trim() ? (
              <div className="mt-1.5 print:mt-1">
                <div className="text-[10px] font-semibold text-neutral-600 print:text-[9px]">Note aggiuntive</div>
                <p className="whitespace-pre-wrap text-neutral-800">{p.interventionFreeNote.trim()}</p>
              </div>
            ) : null
          ) : (
            <p className="whitespace-pre-wrap text-neutral-800">{p.issueSummaryIt}</p>
          )}
          {p.issueOriginalUnparsed ? (
            <div className="mt-1.5 rounded border border-neutral-200 bg-neutral-50 p-1.5 print:mt-1 print:max-h-[6rem] print:overflow-hidden print:p-1">
              <div className="text-[10px] font-semibold text-neutral-600 print:text-[8px]">
                Ulteriori note / testo integrale di riferimento
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-neutral-800 print:text-[8px] print:leading-tight">{p.issueOriginalUnparsed}</p>
            </div>
          ) : null}
          {p.diagnosisResult?.trim() ? (
            <div className="mt-1.5 print:mt-1">
              <div className="text-[10px] font-semibold text-neutral-600 print:text-[9px]">Esito diagnosi</div>
              <p className="whitespace-pre-wrap text-neutral-800">{p.diagnosisResult}</p>
            </div>
          ) : null}
        </section>

        <section className="mt-2 border-t border-neutral-200 pt-1.5 print:mt-1.5 print:pt-1">
          <h2 className="mb-0.5 font-semibold">Importi (EUR)</h2>
          <Row label="Totale ordine" value={formatEURPrint(p.quotationAmount)} />
          <Row label="Acconto" value={formatEURPrint(p.depositAmount)} />
          <Row label="Saldo dovuto" value={formatEURPrint(p.balanceAmount)} />
        </section>

        <section className="mt-2 border-t border-neutral-200 pt-1.5 print:mt-1.5 print:pt-1">
          <h2 className="mb-0.5 font-semibold">Servizio</h2>
          <Row label="Tecnico" value={p.technicianName?.trim() || "—"} />
          <Row label="Durata garanzia (riparazione)" value={mapWarrantyCnToIt(p.warrantyTextCn)} />
          <Row
            label="Etichette accessori"
            value={translateAccessoryTagsToIt(p.internalTag ?? "") || "—"}
          />
        </section>

        <section className="mt-2 border-t border-neutral-300 pt-1.5 print:mt-1.5 print:pt-1">
          <h2 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-700 print:text-[8px]">
            Termini di garanzia
          </h2>
          <ul className="list-inside list-disc space-y-0.5 text-[9px] text-neutral-700 print:space-y-0 print:text-[8px] print:leading-tight">
            {WARRANTY_TERMS_IT.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <footer className="mt-3 border-t border-neutral-300 pt-2 text-[9px] text-neutral-600 print:mt-2 print:pt-1.5 print:text-[8px]">
          Conservare questo documento per eventuali garanzie. I dati personali sono trattati secondo la normativa vigente.
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 font-medium text-neutral-600">{label}:</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
