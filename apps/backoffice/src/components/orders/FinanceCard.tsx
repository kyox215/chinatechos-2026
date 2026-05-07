"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { faultLineLabelItalian } from "@/lib/domain/fault-print-it";
import { FAULT_TYPES, parseFaultsFromIssue } from "@/lib/domain/fault-types";
import { FaultPriceLineInputs, FinancialSummaryThree } from "@/components/orders/QuoteFinanceBlocks";
import { SendQuoteModal } from "@/components/orders/SendQuoteModal";

type Props = {
  orderId: string;
  issueDescription: string;
  faultPrices: Record<string, string>;
  quotationAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  isPaid: boolean;
  isEditable: boolean;
  customerPhone: string | null;
  customerName: string | null;
  deviceLabel: string;
};

function pricesFromIssueAndQuotation(
  issueDescription: string,
  faultPrices: Record<string, string>,
): Record<string, string> {
  const faultMap = parseFaultsFromIssue(issueDescription);
  const lines = Array.from(faultMap.entries()).map(([key, subs]) => {
    const ft = FAULT_TYPES.find((f) => f.key === key);
    const label = ft?.label ?? key;
    const subLabels = subs
      .filter((s) => s !== "_self")
      .map((sk) => ft?.subTypes?.find((st) => st.key === sk)?.label ?? sk);
    return { key, label: subLabels.length > 0 ? `${label}(${subLabels.join(", ")})` : label };
  });
  const init: Record<string, string> = {};
  lines.forEach((f) => { init[f.key] = faultPrices[f.key] ?? ""; });
  return init;
}

export function FinanceCard(props: Props) {
  const router = useRouter();
  const faultMap = parseFaultsFromIssue(props.issueDescription);
  const faultItems = Array.from(faultMap.entries()).map(([key, subs]) => {
    const ft = FAULT_TYPES.find((f) => f.key === key);
    const label = ft?.label ?? key;
    const subLabels = subs
      .filter((s) => s !== "_self")
      .map((sk) => ft?.subTypes?.find((st) => st.key === sk)?.label ?? sk);
    return { key, label: subLabels.length > 0 ? `${label}(${subLabels.join(", ")})` : label };
  });

  const [prices, setPrices] = useState<Record<string, string>>(() =>
    pricesFromIssueAndQuotation(props.issueDescription, props.faultPrices),
  );
  const [deposit, setDeposit] = useState(props.depositAmount != null ? String(props.depositAmount) : "");
  const [isPaid, setIsPaid] = useState(props.isPaid);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (editing) return;
    setPrices(pricesFromIssueAndQuotation(props.issueDescription, props.faultPrices));
  }, [props.issueDescription, props.faultPrices, editing]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  const itemTotal = Object.values(prices).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const quotation = itemTotal > 0 ? itemTotal : (props.quotationAmount ?? 0);
  const depositNum = Number(deposit) || 0;
  const remaining = Math.max(0, quotation - depositNum);
  const receivableDisplay = props.balanceAmount ?? (remaining || null);

  async function handleSave() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationAmount: quotation || null,
          depositAmount: depositNum || null,
          isPaid,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");

      const saveFaultPricesRes = await fetch(`/api/orders/${props.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faultPrices: prices,
        }),
      });
      const saveFaultPricesData = (await saveFaultPricesRes.json()) as { error?: string };
      if (!saveFaultPricesRes.ok) throw new Error(saveFaultPricesData.error ?? "保存分项价格失败");

      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">财务信息</h2>
        {props.isEditable && !editing && (
          <button
            className="ui-btn ui-btn-secondary h-8 min-h-[32px] px-3 text-xs font-medium"
            onClick={() => setEditing(true)}
            type="button"
          >
            编辑
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="text-xs font-medium text-neutral-500">报价明细</div>
          {faultItems.length > 0 ? (
            <FaultPriceLineInputs
              lines={faultItems}
              prices={prices}
              onPriceChange={(key, value) => setPrices((prev) => ({ ...prev, [key]: value }))}
            />
          ) : (
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-neutral-600">
              当前无结构化故障分项；订单总金额取自数据库总额。
            </div>
          )}

          <FinancialSummaryThree
            depositInput={
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-400">&euro;</span>
                <input
                  className="ui-input h-8 max-w-[140px] flex-1 text-xs"
                  onChange={(e) => setDeposit(e.target.value)}
                  placeholder="0"
                  type="number"
                  value={deposit}
                />
              </div>
            }
            orderTotal={quotation}
            receivable={remaining}
          />

          <label className="flex items-center gap-2 text-xs text-neutral-700">
            <input
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300"
            />
            已全额结清
          </label>

          {error && <div className="text-xs text-rose-600">{error}</div>}

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {props.customerPhone && faultItems.length > 0 && quotation > 0 && (
              <button
                className="ui-btn ui-btn-primary h-9 px-4 text-xs"
                onClick={() => setShowSendModal(true)}
                type="button"
              >
                发送报价给客户
              </button>
            )}
            <button
              className="ui-btn ui-btn-primary h-9 px-4 text-xs disabled:opacity-60"
              disabled={pending}
              onClick={handleSave}
              type="button"
            >
              {pending ? "保存中..." : "保存"}
            </button>
            <button
              className="ui-btn ui-btn-secondary h-9 px-3 text-xs"
              onClick={() => setEditing(false)}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {props.quotationAmount != null && (
            <div className="mb-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4">
                <span className="font-medium text-neutral-700">金额摘要</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-neutral-800">
                  <span>
                    合计{" "}
                    <span className="tabular-nums font-semibold">{formatEUR(props.quotationAmount)}</span>
                  </span>
                  {receivableDisplay != null && Number(receivableDisplay) > 0 && !props.isPaid && (
                    <span className="text-rose-700">
                      待收{" "}
                      <span className="tabular-nums font-semibold">{formatEUR(receivableDisplay)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {faultItems.length > 0 && props.quotationAmount != null && (
            <div className="mb-2 space-y-1 border-b border-border pb-2">
              {faultItems.map((item) => (
                <div key={item.key} className="grid grid-cols-[1fr_auto] gap-x-3 text-xs">
                  <span className="min-w-0 text-neutral-600">{item.label}</span>
                  <span className="shrink-0 tabular-nums text-neutral-700">
                    {prices[item.key] ? `€${Number(prices[item.key]).toFixed(2)}` : "-"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Row label="订单总金额" numeric value={formatEUR(props.quotationAmount)} />
          <Row label="定金" numeric value={formatEUR(props.depositAmount)} />
          <Row label="应收金额" numeric value={formatEUR(props.balanceAmount ?? (remaining || null))} />
          <div className="grid grid-cols-1 gap-0.5 py-1 text-sm sm:grid-cols-[minmax(5.25rem,7rem)_1fr] sm:gap-x-3 sm:items-center">
            <span className="text-neutral-500">结清状态</span>
            <div className="flex sm:justify-end">
              <span
                className={
                  props.isPaid
                    ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                    : "inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
                }
              >
                {props.isPaid ? "已结清" : "未结清"}
              </span>
            </div>
          </div>
        </div>
      )}

      {showSendModal && props.customerPhone && (
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
          total={quotation}
        />
      )}
    </section>
  );
}

function Row(props: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-1 text-sm sm:grid-cols-[minmax(5.25rem,7rem)_1fr] sm:gap-x-3 sm:items-baseline">
      <span className="text-neutral-500">{props.label}</span>
      <span
        className={`min-w-0 text-neutral-900 sm:text-right ${props.numeric ? "tabular-nums" : ""}`}
      >
        {props.value}
      </span>
    </div>
  );
}

function formatEUR(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}
