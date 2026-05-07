"use client";

import { PrintOrderButton } from "@/components/orders/PrintOrderButton";
import type { PrintOptions } from "@/lib/domain/print-mode";
import type { OrderPrintPayload } from "@/lib/domain/order-print-it";
import {
  buildFaultPriceLinesFromStoredIssue,
  issueSummaryForPrintIt,
} from "@/lib/domain/fault-print-it";
import { extractFaultExtraNote } from "@/lib/domain/fault-types";

export type OrderDetailPrintProps = {
  publicNo: string;
  customerName: string | null;
  customerPhone: string;
  brand: string;
  model: string;
  serialOrImei: string | null;
  issueDescription: string;
  faultPrices: Record<string, string>;
  diagnosisResult: string | null;
  quotationAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  technicianName: string | null;
  warrantyText: string | null;
  internalTag: string | null;
  customerSignature?: string | null;
  defaultPrintOptions?: PrintOptions;
};

export function OrderDetailPrint(props: OrderDetailPrintProps) {
  const { summaryIt } = issueSummaryForPrintIt(props.issueDescription);
  const faultPriceLines = buildFaultPriceLinesFromStoredIssue(
    props.issueDescription,
    props.faultPrices,
  );
  let interventionFreeNote: string | null =
    extractFaultExtraNote(props.issueDescription).trim() || null;

  // Double guard: when price lines already cover structured faults,
  // strip any remaining Chinese structured patterns from the free note
  if (faultPriceLines.length > 0 && interventionFreeNote) {
    const stripped = interventionFreeNote
      .replace(/[\u4e00-\u9fff]+\s*\([^)]*\)/g, "")
      .replace(/^[;；\s,]+/, "")
      .replace(/[;；\s,]+$/, "")
      .trim();
    interventionFreeNote = stripped || null;
  }

  const payload: OrderPrintPayload = {
    variant: "saved",
    publicNo: props.publicNo,
    printedAtIso: new Date().toISOString(),
    customerName: props.customerName,
    customerPhone: props.customerPhone,
    brand: props.brand,
    model: props.model,
    serialOrImei: props.serialOrImei,
    issueSummaryIt: summaryIt,
    interventionFreeNote,
    diagnosisResult: props.diagnosisResult,
    quotationAmount: props.quotationAmount,
    depositAmount: props.depositAmount,
    balanceAmount: props.balanceAmount,
    technicianName: props.technicianName,
    warrantyTextCn: props.warrantyText,
    internalTag: props.internalTag,
    faultPriceLines: faultPriceLines.length > 0 ? faultPriceLines : undefined,
    customerSignature: props.customerSignature,
  };

  return <PrintOrderButton payload={payload} defaultPrintOptions={props.defaultPrintOptions} />;
}
