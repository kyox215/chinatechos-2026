import type { OrderFinancialSnapshot } from "@/lib/domain/order-money";
import { formatOrderEUR } from "@/lib/domain/order-money";

type Props = {
  money: OrderFinancialSnapshot;
};

/** Compact three-line money block for order list (matches DB field semantics). */
export function OrderListMoneyCell({ money }: Props) {
  return (
    <div className="space-y-0.5 text-[11px] leading-tight tabular-nums text-neutral-800">
      <div>
        <span className="text-neutral-500">总金额 </span>
        {formatOrderEUR(money.quotationAmount)}
      </div>
      <div>
        <span className="text-neutral-500">定金 </span>
        {formatOrderEUR(money.depositAmount)}
      </div>
      <div>
        <span className="text-neutral-500">待收 </span>
        {formatOrderEUR(money.balanceAmount)}
      </div>
    </div>
  );
}
