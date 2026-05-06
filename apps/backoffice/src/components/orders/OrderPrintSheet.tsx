"use client";

import { STORE_ADDRESS, STORE_NAME } from "@/lib/domain/store-info";
import {
  type OrderPrintPayload,
  WARRANTY_TERMS_IT,
  formatEURPrint,
  formatPrintDate,
  mapWarrantyCnToIt,
} from "@/lib/domain/order-print-it";

export function OrderPrintSheet(props: { payload: OrderPrintPayload }) {
  const p = props.payload;
  const title =
    p.variant === "draft"
      ? "Bozza ordine di riparazione"
      : "Ricevuta ordine di riparazione";

  return (
    <div className="order-print-sheet hidden print:block">
      <article className="mx-auto max-w-[148mm] text-[11px] leading-snug text-neutral-900 print:max-w-none print:text-[10px]">
        <header className="border-b border-neutral-300 pb-3">
          <div className="text-base font-bold">{STORE_NAME}</div>
          <div className="text-neutral-700">{STORE_ADDRESS}</div>
          <h1 className="mt-3 text-sm font-semibold uppercase tracking-wide">{title}</h1>
          <p className="text-neutral-600">Documento per il cliente</p>
        </header>

        <section className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          <Row label="Numero ordine" value={p.publicNo?.trim() || "— (bozza)"} />
          <Row label="Data" value={formatPrintDate(p.printedAtIso)} />
          <Row label="Cliente" value={p.customerName?.trim() || "—"} />
          <Row label="Telefono" value={p.customerPhone || "—"} />
        </section>

        <section className="mt-3 border-t border-neutral-200 pt-2">
          <h2 className="mb-1 font-semibold">Dispositivo</h2>
          <Row label="Marca" value={p.brand} />
          <Row label="Modello" value={p.model} />
          <Row label="IMEI / Seriale" value={p.serialOrImei?.trim() || "—"} />
        </section>

        <section className="mt-3 border-t border-neutral-200 pt-2">
          <h2 className="mb-1 font-semibold">Intervento richiesto</h2>
          <p className="whitespace-pre-wrap text-neutral-800">{p.issueSummaryIt}</p>
          {p.issueOriginalUnparsed ? (
            <div className="mt-2 rounded border border-neutral-200 bg-neutral-50 p-2">
              <div className="text-[10px] font-semibold text-neutral-600">
                Ulteriori note / testo integrale di riferimento
              </div>
              <p className="mt-1 whitespace-pre-wrap text-neutral-800">{p.issueOriginalUnparsed}</p>
            </div>
          ) : null}
          {p.diagnosisResult?.trim() ? (
            <div className="mt-2">
              <div className="text-[10px] font-semibold text-neutral-600">Esito diagnosi</div>
              <p className="whitespace-pre-wrap text-neutral-800">{p.diagnosisResult}</p>
            </div>
          ) : null}
        </section>

        <section className="mt-3 border-t border-neutral-200 pt-2">
          <h2 className="mb-1 font-semibold">Importi (EUR)</h2>
          <Row label="Totale ordine" value={formatEURPrint(p.quotationAmount)} />
          <Row label="Acconto" value={formatEURPrint(p.depositAmount)} />
          <Row label="Saldo dovuto" value={formatEURPrint(p.balanceAmount)} />
        </section>

        <section className="mt-3 border-t border-neutral-200 pt-2">
          <h2 className="mb-1 font-semibold">Servizio</h2>
          <Row label="Tecnico" value={p.technicianName?.trim() || "—"} />
          <Row label="Durata garanzia (riparazione)" value={mapWarrantyCnToIt(p.warrantyTextCn)} />
          <Row label="Etichette accessori" value={p.internalTag?.trim() || "—"} />
        </section>

        <section className="mt-4 border-t border-neutral-300 pt-3">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-700">
            Termini di garanzia
          </h2>
          <ul className="list-inside list-disc space-y-1 text-[9px] text-neutral-700">
            {WARRANTY_TERMS_IT.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <footer className="mt-6 border-t border-neutral-300 pt-3 text-[9px] text-neutral-600">
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
