"use client";

import { cn } from "@/lib/utils";
import { useResolvedOrderUi } from "@/components/order-ui/OrderUiProvider";
import { orderStatusHasLivePulse } from "@/lib/domain/order-list-tabs";
import { resolveStatusLabel } from "@/lib/domain/order-ui-config";
import { getOrderStatusPresentation } from "@/lib/order-status";

export function OrderStatusBadge(props: { status: string }) {
  const ui = useResolvedOrderUi();
  const p = getOrderStatusPresentation(props.status);
  const label = resolveStatusLabel(props.status, ui);
  const title = p.badgeTitle ?? label;
  const live = orderStatusHasLivePulse(props.status);
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-border/70 px-2 py-0.5",
        p.rowBg,
      )}
    >
      <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
        {live ? (
          <span
            aria-hidden
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              p.dotColor,
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex h-2 w-2 shrink-0 rounded-full", p.dotColor)} />
      </span>
      <span className={cn("min-w-0 truncate text-xs font-medium", p.textColor)}>{label}</span>
    </span>
  );
}
