import type { OrderFinancialSnapshot } from "@/lib/domain/order-money";
import { formatOrderEUR } from "@/lib/domain/order-money";

type Props = {
  money: OrderFinancialSnapshot;
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
export function OrderListMoneyCell({ money }: Props) {
  const hasReceivable = money.balanceAmount != null && money.balanceAmount > 0;
  return (
    <div className="space-y-1 leading-none">
      <MoneyRow label="总金额" value={formatOrderEUR(money.quotationAmount)} />
      <MoneyRow label="定金" value={formatOrderEUR(money.depositAmount)} />
      <MoneyRow
        label="待收"
        value={formatOrderEUR(money.balanceAmount)}
        valueColor={hasReceivable ? "text-rose-700 font-medium" : undefined}
      />
    </div>
  );
}
