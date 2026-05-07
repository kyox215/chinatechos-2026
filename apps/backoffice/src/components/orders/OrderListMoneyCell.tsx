import type { OrderFinancialSnapshot } from "@/lib/domain/order-money";
import { formatOrderEUR } from "@/lib/domain/order-money";

type Props = {
  money: OrderFinancialSnapshot;
  /** Single-line / wrap-friendly summary for dense mobile cards */
  compact?: boolean;
  /** Extra classes on the compact row (e.g. justify-end for right column layout) */
  className?: string;
};

function MoneyRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="grid grid-cols-[2.75rem_1fr] items-baseline gap-x-2">
      <span className="text-[10px] font-medium text-neutral-500">{label}</span>
      <span className={`text-[11px] tabular-nums text-right ${valueColor ?? "text-neutral-900"}`}>{value}</span>
    </div>
  );
}

/** Full-label rows with semantic color for receivable; matches FinanceCard style. */
export function OrderListMoneyCell({ money, compact, className }: Props) {
  const hasReceivable = money.balanceAmount != null && money.balanceAmount > 0;
  const balanceCls = hasReceivable ? "text-rose-700 font-medium" : "text-neutral-900";

  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[10px] leading-tight tabular-nums ${className ?? ""}`}
      >
        <span className="text-neutral-500">总金额</span>
        <span className="text-neutral-900">{formatOrderEUR(money.quotationAmount)}</span>
        <span className="text-neutral-300">·</span>
        <span className="text-neutral-500">定金</span>
        <span className="text-neutral-900">{formatOrderEUR(money.depositAmount)}</span>
        <span className="text-neutral-300">·</span>
        <span className="text-neutral-500">待收</span>
        <span className={balanceCls}>{formatOrderEUR(money.balanceAmount)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1 leading-none">
      <MoneyRow label="总金额" value={formatOrderEUR(money.quotationAmount)} />
      <MoneyRow label="定金" value={formatOrderEUR(money.depositAmount)} />
      <MoneyRow label="待收" value={formatOrderEUR(money.balanceAmount)} valueColor={hasReceivable ? "text-rose-700 font-medium" : undefined} />
    </div>
  );
}
