"use client";

import type { ActionItem } from "@/lib/domain/order-status";
import { getOrderStatusPresentation } from "@/lib/order-status";

export function StatusProgressRail(props: {
  statusOrder: readonly string[];
  currentStatus: string;
  labelFor: (statusKey: string) => string;
  /** 不含当前状态；点击时用其中的 confirmText / variant */
  transitions: Map<string, ActionItem>;
  onStepPress: (toStatus: string) => void;
  pending?: boolean;
  className?: string;
}) {
  const { statusOrder, currentStatus, labelFor, transitions, onStepPress, pending, className } =
    props;
  const curIdx = statusOrder.indexOf(currentStatus);

  return (
    <div
      aria-label="工单状态进度"
      className={`grid w-full grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-x-1 gap-y-2 ${className ?? ""}`}
      role="list"
    >
      {statusOrder.map((s, i) => {
        const label = labelFor(s);
        const pres = getOrderStatusPresentation(s);
        const isCurrent = s === currentStatus;
        const isPast = curIdx !== -1 && i < curIdx;
        const action = transitions.get(s);
        const danger = action?.variant === "danger";

        const dotFilled = isPast || isCurrent;
        const dotClass = [
          "mx-auto h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-shadow",
          dotFilled ? `${pres.dotColor} border-transparent` : "border-border bg-surface",
          isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : "",
        ].join(" ");

        const labelClass = [
          "line-clamp-2 w-full text-[10px] leading-tight sm:text-[11px]",
          isCurrent ? "font-semibold text-neutral-900" : isPast ? "text-neutral-600" : "text-neutral-500",
          danger && !isCurrent ? "text-rose-700" : "",
        ].join(" ");

        if (isCurrent) {
          return (
            <div
              key={s}
              aria-current="step"
              className="flex min-h-10 w-full flex-col items-center justify-center gap-1 rounded-xl border border-primary/40 bg-surface-2 px-0.5 py-2 text-center ring-2 ring-primary ring-offset-2 ring-offset-surface"
              role="listitem"
            >
              <span aria-hidden className={dotClass} />
              <span className={labelClass}>{label}</span>
            </div>
          );
        }

        const canPress = Boolean(action) && !pending;
        const btnSurface = danger
          ? "border-rose-200/80 bg-surface-2 text-rose-700 hover:bg-rose-50 active:bg-rose-100"
          : "border-border bg-surface-2 hover:bg-muted active:bg-muted";

        return (
          <button
            key={s}
            aria-label={`切换到 ${label}`}
            className={`flex min-h-10 w-full flex-col items-center justify-center gap-1 rounded-xl border px-0.5 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${btnSurface}`}
            disabled={!canPress}
            onClick={() => action && onStepPress(action.toStatus)}
            role="listitem"
            type="button"
          >
            <span aria-hidden className={dotClass} />
            <span className={labelClass}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
