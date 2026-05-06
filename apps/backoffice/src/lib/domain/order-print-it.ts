export type OrderPrintVariant = "draft" | "saved";

export type OrderPrintPayload = {
  variant: OrderPrintVariant;
  /** Null or empty when draft */
  publicNo: string | null;
  printedAtIso: string;
  customerName: string | null;
  customerPhone: string;
  brand: string;
  model: string;
  serialOrImei: string | null;
  issueSummaryIt: string;
  issueOriginalUnparsed?: string;
  diagnosisResult: string | null;
  quotationAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  technicianName: string | null;
  warrantyTextCn: string | null;
  internalTag: string | null;
};

export function formatEURPrint(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatPrintDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function mapWarrantyCnToIt(warrantyTextCn: string | null | undefined): string {
  const s = (warrantyTextCn ?? "").trim();
  if (s === "3个月") return "3 mesi sulla parte riparata/sostituita";
  if (s === "6个月") return "6 mesi sulla parte riparata/sostituita";
  if (s === "12个月") return "12 mesi sulla parte riparata/sostituita";
  if (!s) return "Come da accordi in negozio";
  return s;
}

export const WARRANTY_TERMS_IT: string[] = [
  "La garanzia copre esclusivamente difetti di materiale o di lavorazione relativi ai componenti sostituiti o alla riparazione effettuata (es. display, batteria, connettore, ecc.), nel limite della durata indicata.",
  "Non sono coperti: danni da uso improprio o negligenza; cadute, urti, piegature o pressione sul dispositivo; ingresso di liquidi o corrosione; sovratensioni elettriche o fulmini; incendi o eventi naturali; tentativi di riparazione da terzi dopo il nostro intervento; danni estetici preesistenti non oggetto dell'intervento.",
  "In particolare, rotture di vetro touchscreen/LCD, ammaccature o crepe successive all'intervento, se dovute a incidenti o uso non corretto, non sono coperte. La garanzia non include software, account, dati personali o accessori non riparati da noi.",
  "Eventuali reclami devono essere segnalati tempestivamente in negozio, mostrando questo documento e il dispositivo.",
];
