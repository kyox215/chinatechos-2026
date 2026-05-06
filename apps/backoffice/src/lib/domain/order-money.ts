/**
 * Types and EUR formatting aligned with `repair_orders` money columns:
 * `quotation_amount`, `deposit_amount`, `balance_amount`.
 */

/** Snapshot of persisted order money fields (null = unset in DB). */
export type OrderFinancialSnapshot = {
  quotationAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
};

/** Formats stored EUR amounts for list/detail UI; null renders as "-". */
export function formatOrderEUR(value: number | null): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}
