import { STORE_ADDRESS, STORE_NAME } from "@/lib/domain/store-info";

export type InventorySalePrintPayload = {
  printedAtIso: string;
  publicNo: string;
  productChannelLabel: string;
  brand: string;
  model: string;
  imeiOrSerial: string | null;
  listPriceEur: number | null;
  soldPriceEur: number | null;
  conditionSummaryIt: string | null;
};

export function formatEURPrint(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export function formatPrintDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(iso));
}

export function buildInventorySalePrintPayload(input: {
  publicNo: string;
  productChannel: string;
  brand: string;
  model: string;
  imeiOrSerial: string | null;
  listPrice: number | null;
  soldPrice: number | null;
  qaReport: Record<string, unknown>;
}): InventorySalePrintPayload {
  const channelMap: Record<string, string> = {
    new_retail: "Nuovo",
    refurbished: "Ricondizionato",
    trade_in: "Permuta / usato",
  };
  const conditionSummaryIt = summarizeQaForPrintIt(input.qaReport);
  return {
    printedAtIso: new Date().toISOString(),
    publicNo: input.publicNo,
    productChannelLabel: channelMap[input.productChannel] ?? input.productChannel,
    brand: input.brand,
    model: input.model,
    imeiOrSerial: input.imeiOrSerial,
    listPriceEur: input.listPrice,
    soldPriceEur: input.soldPrice,
    conditionSummaryIt,
  };
}

function summarizeQaForPrintIt(qa: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(qa)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as { result?: string; label_keys?: string[]; note?: string };
      if (o.result === "defect") {
        const labels = (o.label_keys ?? []).join(", ");
        const bit = [k, labels, o.note].filter(Boolean).join(" · ");
        if (bit) parts.push(bit);
      }
    }
  }
  if (parts.length === 0) return null;
  return parts.join("; ");
}

export { STORE_NAME, STORE_ADDRESS };

/** Must stay in sync with `POST /api/inventory/[id]/print-log` audit payload. */
export const TRADE_IN_AGREEMENT_LEGAL_VERSION = "trade_in_it_v1";

export type TradeInAgreementPrintPayload = {
  printedAtIso: string;
  publicNo: string;
  brand: string;
  model: string;
  imeiOrSerial: string | null;
  sellerLineIt: string | null;
  legalVersion: string;
};

export function buildTradeInAgreementPrintPayload(input: {
  publicNo: string;
  brand: string;
  model: string;
  imeiOrSerial: string | null;
  sellerLabel?: string | null;
}): TradeInAgreementPrintPayload {
  return {
    printedAtIso: new Date().toISOString(),
    publicNo: input.publicNo,
    brand: input.brand,
    model: input.model,
    imeiOrSerial: input.imeiOrSerial,
    sellerLineIt: input.sellerLabel?.trim() || null,
    legalVersion: TRADE_IN_AGREEMENT_LEGAL_VERSION,
  };
}
