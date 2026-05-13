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
      <div className="text-xs font-medium text-muted-foreground">按项报价</div>
      {props.lines.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-2">
          <span className="text-xs text-foreground">{item.label}</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">&euro;</span>
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
        <span className="text-xs font-semibold text-foreground">订单总金额</span>
        <span className="text-sm font-semibold text-foreground font-mono tabular-nums">&euro;{props.orderTotal.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-foreground">定金</span>
        <div className="flex min-w-0 flex-1 justify-end">{props.depositInput}</div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">应收金额</span>
        <span className="text-sm font-semibold text-foreground font-mono tabular-nums">&euro;{props.receivable.toFixed(2)}</span>
      </div>
      <p className="text-[10px] text-muted-foreground">保存时由服务端按总金额与定金自动写入余额</p>
    </div>
  );
}
