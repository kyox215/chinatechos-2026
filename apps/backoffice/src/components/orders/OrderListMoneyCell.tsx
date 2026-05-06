import type { OrderFinancialSnapshot } from "@/lib/domain/order-money";
import { formatOrderEUR } from "@/lib/domain/order-money";

type Props = {
  money: OrderFinancialSnapshot;
};

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1.625rem_1fr] items-baseline gap-x-2">
      <span className="text-[10px] font-medium text-neutral-500">{label}</span>
      <span className="text-[11px] tabular-nums text-right text-neutral-900">{value}</span>
    </div>
  );
}

/** Compact finance block: aligned columns + light container (matches DB semantics). */
export function OrderListMoneyCell({ money }: Props) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/35 px-2 py-1.5 dark:bg-muted/25">
      <div className="space-y-0.5 leading-none">
        <MoneyRow label="总" value={formatOrderEUR(money.quotationAmount)} />
        <MoneyRow label="定" value={formatOrderEUR(money.depositAmount)} />
        <MoneyRow label="收" value={formatOrderEUR(money.balanceAmount)} />
      </div>
    </div>
  );
}
