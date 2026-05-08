"use client";

import { useLayoutEffect, useRef } from "react";
import { getOrderStatusPresentation } from "@/lib/order-status";

export function StatusProgressRail(props: {
  statusOrder: readonly string[];
  currentStatus: string;
  labelFor: (statusKey: string) => string;
  variant: "horizontal" | "vertical";
  /** 打开面板时为 true，用于将当前步骤滚入可视区域 */
  scrollActiveIntoView?: boolean;
  className?: string;
}) {
  const activeRef = useRef<HTMLDivElement>(null);
  const curIdx = props.statusOrder.indexOf(props.currentStatus);

  useLayoutEffect(() => {
    if (!props.scrollActiveIntoView || !activeRef.current) return;
    activeRef.current.scrollIntoView({
      behavior: "smooth",
      inline: props.variant === "horizontal" ? "center" : "nearest",
      block: props.variant === "vertical" ? "center" : "nearest",
    });
  }, [props.scrollActiveIntoView, props.currentStatus, props.variant]);

  return props.variant === "horizontal" ? (
    <div
      className={`flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 ${props.className ?? ""}`}
      role="list"
      aria-label="工单状态进度"
    >
      {props.statusOrder.map((s, i) => {
        const label = props.labelFor(s);
        const pres = getOrderStatusPresentation(s);
        const isCurrent = s === props.currentStatus;
        const isPast = curIdx !== -1 && i < curIdx;
        const dotFilled = isPast || isCurrent;
        const dotClass = [
          "h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-shadow",
          dotFilled ? `${pres.dotColor} border-transparent` : "border-border bg-surface",
          isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : "",
        ].join(" ");

        return (
          <div
            key={s}
            ref={isCurrent ? activeRef : undefined}
            className="flex min-w-[4.25rem] max-w-[5.5rem] shrink-0 snap-center flex-col items-center gap-1"
            role="listitem"
          >
            <div className={dotClass} title={label} />
            <span
              className={`line-clamp-2 text-center text-[10px] leading-tight ${
                isCurrent ? "font-semibold text-neutral-900" : isPast ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  ) : (
    <ul className={`space-y-0 py-1 ${props.className ?? ""}`} aria-label="工单状态进度">
      {props.statusOrder.map((s, i) => {
        const label = props.labelFor(s);
        const pres = getOrderStatusPresentation(s);
        const isLast = i === props.statusOrder.length - 1;
        const isCurrent = s === props.currentStatus;
        const isPast = curIdx !== -1 && i < curIdx;
        const dotFilled = isPast || isCurrent;
        const dotClass = [
          "h-2.5 w-2.5 shrink-0 rounded-full border-2",
          dotFilled ? `${pres.dotColor} border-transparent` : "border-border bg-surface",
          isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : "",
        ].join(" ");

        return (
          <li key={s} className="flex gap-3">
            <div className="flex w-5 shrink-0 flex-col items-center">
              <div ref={isCurrent ? activeRef : undefined} className={dotClass} title={label} />
              {!isLast ? <div className="mt-1 min-h-[14px] w-px flex-1 bg-border" aria-hidden /> : null}
            </div>
            <span
              className={`pb-3 text-xs leading-5 last:pb-0 ${
                isCurrent ? "font-semibold text-neutral-900" : isPast ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
