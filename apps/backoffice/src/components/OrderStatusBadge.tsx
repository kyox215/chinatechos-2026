import { getOrderStatusPresentation } from "@/lib/order-status";

export function OrderStatusBadge(props: { status: string }) {
  const p = getOrderStatusPresentation(props.status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2 py-0.5 ${p.rowBg}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${p.dotColor}`} />
      <span className={`text-xs font-medium ${p.textColor}`}>{p.label}</span>
    </span>
  );
}
