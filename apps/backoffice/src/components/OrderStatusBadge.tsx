import { getOrderStatusPresentation } from "@/lib/order-status";

export function OrderStatusBadge(props: { status: string }) {
  const p = getOrderStatusPresentation(props.status);
  const title = p.badgeTitle ?? p.label;
  return (
    <span
      title={title}
      className={`inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-border/70 px-2 py-0.5 ${p.rowBg}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${p.dotColor}`} />
      <span className={`min-w-0 truncate text-xs font-medium ${p.textColor}`}>{p.label}</span>
    </span>
  );
}
