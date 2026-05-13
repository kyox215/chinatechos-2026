"use client";

import { useState } from "react";
import { faultLineLabelItalian } from "@/lib/domain/fault-print-it";
import { FAULT_TYPES, parseFaultsFromIssue } from "@/lib/domain/fault-types";
import { SendQuoteModal } from "@/components/orders/SendQuoteModal";

type Props = {
  orderId: string;
  issueDescription: string;
  customerPhone: string;
  customerName: string | null;
  deviceLabel: string;
  currentQuotation: number | null;
};

export function QuoteForm(props: Props) {
  const faultMap = parseFaultsFromIssue(props.issueDescription);
  const faultItems = Array.from(faultMap.entries()).map(([key, subs]) => {
    const ft = FAULT_TYPES.find((f) => f.key === key);
    const label = ft?.label ?? key;
    const subLabels = subs.filter((s) => s !== "_self").map((sk) => ft?.subTypes?.find((st) => st.key === sk)?.label ?? sk);
    return { key, label: subLabels.length > 0 ? `${label}(${subLabels.join(", ")})` : label };
  });

  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    faultItems.forEach((f) => { init[f.key] = ""; });
    return init;
  });
  const [showSendModal, setShowSendModal] = useState(false);

  const total = Object.values(prices).reduce((sum, v) => sum + (Number(v) || 0), 0);

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground font-display">报价明细</h2>

      <div className="space-y-2">
        {faultItems.length === 0 ? (
          <div className="text-xs text-muted-foreground">无故障项可报价，请先在维修信息中添加故障</div>
        ) : (
          faultItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground">{item.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">€</span>
                <input
                  className="ui-input h-8 w-20 text-xs"
                  onChange={(e) => setPrices((p) => ({ ...p, [item.key]: e.target.value }))}
                  placeholder="0"
                  type="number"
                  value={prices[item.key]}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="text-sm font-semibold text-foreground font-mono">
          合计: €{total.toFixed(2)}
        </div>
        <button
          className="ui-btn ui-btn-primary h-9 px-4 text-xs"
          disabled={total <= 0}
          onClick={() => setShowSendModal(true)}
          type="button"
        >
          发送报价给客户
        </button>
      </div>

      <SendQuoteModal
        open={showSendModal}
        onClose={() => setShowSendModal(false)}
        orderId={props.orderId}
        customerPhone={props.customerPhone}
        customerName={props.customerName}
        deviceLabel={props.deviceLabel}
        faultItems={faultItems.map((f) => ({
          label: faultLineLabelItalian(f.key, faultMap.get(f.key) ?? []),
          price: Number(prices[f.key]) || 0,
        }))}
        total={total}
      />
    </section>
  );
}
