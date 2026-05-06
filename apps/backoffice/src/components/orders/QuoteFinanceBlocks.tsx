"use client";

import type { ReactNode } from "react";

export function FaultPriceLineInputs(props: {
  lines: { key: string; label: string }[];
  prices: Record<string, string>;
  onPriceChange: (key: string, value: string) => void;
}) {
  if (props.lines.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-neutral-500">按项报价</div>
      {props.lines.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-700">{item.label}</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-400">&euro;</span>
            <input
              className="ui-input h-8 w-20 text-xs"
              onChange={(e) => props.onPriceChange(item.key, e.target.value)}
              placeholder="0"
              type="number"
              value={props.prices[item.key] ?? ""}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinancialSummaryThree(props: {
  orderTotal: number;
  depositInput: ReactNode;
  receivable: number;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-900">订单总金额</span>
        <span className="text-sm font-semibold text-neutral-900">&euro;{props.orderTotal.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-neutral-700">定金</span>
        <div className="flex min-w-0 flex-1 justify-end">{props.depositInput}</div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-900">应收金额</span>
        <span className="text-sm font-semibold text-neutral-900">&euro;{props.receivable.toFixed(2)}</span>
      </div>
    </div>
  );
}
