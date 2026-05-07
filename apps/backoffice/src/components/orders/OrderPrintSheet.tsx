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

function fmtDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function OrderPrintSheet(props: { payload: OrderPrintPayload }) {
  const p = props.payload;
  const title = p.isRework
    ? "Ricevuta riparazione in garanzia"
    : p.variant === "draft"
      ? "Bozza ordine di riparazione"
      : "Ricevuta ordine di riparazione";

  return (
    <div className="order-print-sheet">
      <article className="w-full border border-neutral-300 p-2 text-[8.5px] leading-tight text-neutral-900 print:border-neutral-300">
        <div className="grid h-full grid-cols-[1fr_auto_1fr] gap-2">
          <section className="min-w-0 space-y-1 pr-1">
            <header className="border-b border-neutral-300 pb-1">
              <div className="text-[11px] font-bold">{STORE_NAME}</div>
              <div className="text-[7.5px] text-neutral-700">{STORE_ADDRESS}</div>
              <h1 className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{title}</h1>
              <p className="text-[7.5px] text-neutral-600">Documento per il cliente</p>
            </header>

            <section className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <Row label="Numero ordine" value={p.publicNo?.trim() || "— (bozza)"} />
              <Row label="Data" value={formatPrintDate(p.printedAtIso)} />
              <Row label="Cliente" value={p.customerName?.trim() || "—"} />
              <Row label="Telefono" value={p.customerPhone || "—"} />
            </section>

            <section className="border-t border-neutral-200 pt-1">
              <h2 className="mb-0.5 text-[9px] font-semibold">Dispositivo</h2>
              <Row label="Marca" value={p.brand} />
              <Row label="Modello" value={p.model} />
              <Row label="IMEI / Seriale" value={p.serialOrImei?.trim() || "—"} />
            </section>

            {p.isRework && (
              <section className="border-t border-neutral-200 pt-1">
                <h2 className="mb-0.5 text-[9px] font-semibold">Riparazione in garanzia</h2>
                <Row label="Ordine originale" value={p.originalPublicNo?.trim() || "—"} />
                <Row label="Data completamento originale" value={fmtDateOnly(p.originalCompletedAt)} />
                <Row label="Durata garanzia originale" value={mapWarrantyCnToIt(p.originalWarrantyText)} />
                <Row label="Stato garanzia" value={p.warrantyRemainingIt || "—"} />
              </section>
            )}

            <section className="border-t border-neutral-200 pt-1">
              <h2 className="mb-0.5 text-[9px] font-semibold">Intervento richiesto</h2>
              {p.faultPriceLines && p.faultPriceLines.length > 0 ? (
                <table className="w-full border-collapse text-[8px]">
                  <thead>
                    <tr className="border-b border-neutral-300 text-left text-neutral-600">
                      <th className="py-0.5 pr-1 font-medium">Descrizione</th>
                      <th className="py-0.5 font-medium">Importo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.faultPriceLines.map((row, i) => (
                      <tr key={`${row.labelIt}-${i}`} className="border-b border-neutral-100">
                        <td className="py-0.5 pr-1 align-top text-neutral-800">{row.labelIt}</td>
                        <td className="py-0.5 whitespace-nowrap align-top tabular-nums text-neutral-800">
                          {formatEURPrint(row.amountEur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="whitespace-pre-wrap text-[8px] text-neutral-800">{p.issueSummaryIt}</p>
              )}
              {p.interventionFreeNote?.trim() ? (
                <p className="mt-1 whitespace-pre-wrap text-[8px] text-neutral-700">{p.interventionFreeNote.trim()}</p>
              ) : null}
              {p.diagnosisResult?.trim() ? (
                <p className="mt-1 whitespace-pre-wrap text-[8px] text-neutral-700">
                  <span className="font-semibold">Esito diagnosi: </span>
                  {p.diagnosisResult}
                </p>
              ) : null}
            </section>

            <section className="border-t border-neutral-200 pt-1">
              <h2 className="mb-0.5 text-[9px] font-semibold">Importi (EUR)</h2>
              <Row label="Totale ordine" value={formatEURPrint(p.quotationAmount)} />
              <Row label="Acconto" value={formatEURPrint(p.depositAmount)} />
              <Row label="Saldo dovuto" value={formatEURPrint(p.balanceAmount)} />
            </section>

            <section className="border-t border-neutral-200 pt-1">
              <h2 className="mb-0.5 text-[9px] font-semibold">Servizio</h2>
              <Row label="Tecnico" value={p.technicianName?.trim() || "—"} />
              <Row label="Durata garanzia" value={mapWarrantyCnToIt(p.warrantyTextCn)} />
              <Row label="Etichette accessori" value={translateAccessoryTagsToIt(p.internalTag ?? "") || "—"} />
            </section>
          </section>

          <div className="h-full border-l border-dashed border-neutral-400" />

          <section className="flex min-w-0 flex-col space-y-1 pl-1">
            <header className="border-b border-neutral-300 pb-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide">Garanzia e informazioni negozio</div>
              <div className="mt-0.5 text-[7.5px] text-neutral-700">{STORE_NAME}</div>
              <div className="text-[7.5px] text-neutral-700">{STORE_ADDRESS}</div>
            </header>

            <section className="flex-1 border-b border-neutral-200 pb-1">
              <h2 className="mb-0.5 text-[9px] font-semibold">Termini di garanzia</h2>
              <ul className="list-inside list-disc space-y-0.5 text-[7.5px] leading-snug text-neutral-700">
                {WARRANTY_TERMS_IT.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>

            <section className="border-b border-neutral-200 pb-1">
              <h2 className="mb-0.5 text-[9px] font-semibold">Firma cliente</h2>
              {p.customerSignature ? (
                <img
                  src={p.customerSignature}
                  alt="Firma"
                  className="mt-1 h-[12mm] w-auto object-contain"
                />
              ) : (
                <div className="mt-2 h-8 border-b border-neutral-400" />
              )}
            </section>

            <footer className="pt-1 text-[7.5px] text-neutral-600">
              Conservare questo documento per eventuali garanzie. I dati personali sono trattati secondo la normativa vigente.
            </footer>
          </section>
        </div>
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
