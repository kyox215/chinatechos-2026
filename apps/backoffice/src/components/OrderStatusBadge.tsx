import { getOrderStatusPresentation } from "@/lib/order-status";

export function OrderStatusBadge(props: { status: string }) {
  const status = getOrderStatusPresentation(props.status);
  return (
    <span className={["inline-flex rounded-full border px-2 py-1 text-xs font-semibold", status.className].join(" ")}>
      {status.label}
    </span>
  );
}
