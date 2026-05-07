"use client";

import { STORE_ADDRESS, STORE_NAME } from "@/lib/domain/store-info";
import type { TradeInAgreementPrintPayload } from "@/lib/domain/inventory-print-it";
import { formatPrintDate } from "@/lib/domain/inventory-print-it";

function Row(props: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[8px] leading-tight">
      <span className="text-neutral-600">{props.label}</span>
      <span className="text-right font-medium text-neutral-900">{props.value}</span>
    </div>
  );
}

/** Clausole di base per permuta / acquisto usato (versione stampabile; aggiornare il testo legale con il consulente). */
const LEGAL_CLAUSES_IT = [
  "Il venditore dichiara di essere il legittimo proprietario del dispositivo e di avere il diritto di trasferirne la proprietà.",
  "Il venditore dichiara che il dispositivo non è ricettato, non è oggetto di controversie giudiziarie e che non risulta segnalato come smarrito o rubato (ove applicabile).",
  "Il venditore accetta che il punto vendita verifichi IMEI / stato del dispositivo e documenti per finalità di conformità e anti-riciclaggio.",
  "Il corrispettivo della permuta / acquisto è quello indicato sul sistema interno al momento dell’accettazione; eventuali ritocchi sono soggetti a verifica finale del dispositivo.",
  "Il venditore autorizza la cancellazione dei dati personali sul dispositivo secondo le procedure del punto vendita.",
];

export function TradeInAgreementPrintSheet(props: { payload: TradeInAgreementPrintPayload }) {
  const p = props.payload;
  return (
    <div className="order-print-sheet" id="inventory-trade-in-print-sheet">
      <article className="w-full border border-neutral-300 p-2 text-[8.5px] leading-tight text-neutral-900 print:border-neutral-300">
        <header className="border-b border-neutral-300 pb-1">
          <div className="text-[11px] font-bold">{STORE_NAME}</div>
          <div className="text-[7.5px] text-neutral-700">{STORE_ADDRESS}</div>
          <h1 className="mt-1 text-[10px] font-semibold uppercase tracking-wide">Accordo di permuta / acquisto usato</h1>
          <p className="text-[7.5px] text-neutral-600">Documento di trasferimento proprietà — uso interno e cliente</p>
        </header>
        <section className="mt-2 space-y-0.5">
          <Row label="Numero inventario" value={p.publicNo || "—"} />
          <Row label="Data/ora" value={formatPrintDate(p.printedAtIso)} />
          <Row label="Marca / Modello" value={`${p.brand} ${p.model}`.trim()} />
          <Row label="IMEI / SN" value={p.imeiOrSerial?.trim() || "—"} />
          <Row label="Venditore (anagrafica registrata)" value={p.sellerLineIt?.trim() || "—"} />
          <Row label="Versione testo legale" value={p.legalVersion} />
        </section>
        <section className="mt-2 border-t border-neutral-200 pt-1">
          <h2 className="mb-0.5 text-[9px] font-semibold">Clausole</h2>
          <ol className="list-decimal space-y-1 pl-4 text-[8px] text-neutral-800">
            {LEGAL_CLAUSES_IT.map((t, i) => (
              <li key={i} className="leading-snug">
                {t}
              </li>
            ))}
          </ol>
        </section>
        <section className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-2">
          <div>
            <div className="text-[7.5px] font-medium text-neutral-700">Firma venditore</div>
            <div className="mt-6 border-b border-neutral-400" />
          </div>
          <div>
            <div className="text-[7.5px] font-medium text-neutral-700">Firma punto vendita</div>
            <div className="mt-6 border-b border-neutral-400" />
          </div>
        </section>
        <p className="mt-2 text-[7.5px] text-neutral-500">
          Conservare una copia per archivio. Per modifiche al testo legale aggiornare la versione indicata sopra e coordinarsi con il legale.
        </p>
      </article>
    </div>
  );
}
