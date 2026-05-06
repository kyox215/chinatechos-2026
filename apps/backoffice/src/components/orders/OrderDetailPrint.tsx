"use client";

import { PrintOrderButton } from "@/components/orders/PrintOrderButton";
import type { OrderPrintPayload } from "@/lib/domain/order-print-it";
import { issueSummaryForPrintIt } from "@/lib/domain/fault-print-it";

export type OrderDetailPrintProps = {
  publicNo: string;
  customerName: string | null;
  customerPhone: string;
  brand: string;
  model: string;
  serialOrImei: string | null;
  issueDescription: string;
  diagnosisResult: string | null;
  quotationAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  technicianName: string | null;
  warrantyText: string | null;
  internalTag: string | null;
};

export function OrderDetailPrint(props: OrderDetailPrintProps) {
  const { summaryIt, originalUnparsed } = issueSummaryForPrintIt(props.issueDescription);

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
    issueOriginalUnparsed: originalUnparsed,
    diagnosisResult: props.diagnosisResult,
    quotationAmount: props.quotationAmount,
    depositAmount: props.depositAmount,
    balanceAmount: props.balanceAmount,
    technicianName: props.technicianName,
    warrantyTextCn: props.warrantyText,
    internalTag: props.internalTag,
  };

  return <PrintOrderButton payload={payload} />;
}
