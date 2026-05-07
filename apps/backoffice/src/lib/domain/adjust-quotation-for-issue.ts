import { parseFaultsFromIssue } from "@/lib/domain/fault-types";

function faultKeysFromIssue(issue: string): string[] {
  const map = parseFaultsFromIssue(issue);
  return [...map.keys()].filter((k) => (map.get(k)?.length ?? 0) > 0);
}

/**
 * When fault categories are only removed (subset), rescale total using equal split per category,
 * matching FinanceCard behaviour (quotation / count of fault keys).
 */
export function adjustQuotationAfterFaultRemoval(
  oldIssue: string,
  newIssue: string,
  quotationAmount: number | null,
): number | null {
  if (quotationAmount == null || quotationAmount <= 0) return quotationAmount;

  const oldKeys = faultKeysFromIssue(oldIssue);
  const newKeys = faultKeysFromIssue(newIssue);
  if (oldKeys.length === 0) return quotationAmount;

  const perLine = quotationAmount / oldKeys.length;
  const isRemovalOnly =
    newKeys.length <= oldKeys.length && newKeys.every((k) => oldKeys.includes(k));

  if (isRemovalOnly) {
    return Math.round(perLine * newKeys.length * 100) / 100;
  }

  return quotationAmount;
}
