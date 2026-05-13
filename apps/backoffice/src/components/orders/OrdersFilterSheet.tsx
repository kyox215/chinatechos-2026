"use client";

import { Filter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { ORDER_STATUS_LABELS, ORDER_STATUS_SELECT_SEQUENCE } from "@/lib/domain/order-status";
import { parseOrderStatusTab, type OrderStatusTab } from "@/lib/domain/order-list-tabs";
import { cn } from "@/lib/utils";

type SupplierOption = { id: string; short_name: string; color: string };

type Draft = {
  statusFilter: string;
  orderType: string;
  technician: string;
  paid: "all" | "yes" | "no";
  supplier: string;
  dateFrom: string;
  dateTo: string;
  approvalOverdue: boolean;
  pickupOverdue: boolean;
};

function normalizeQuery(value: string | null): string | undefined {
  if (!value) return undefined;
  return value;
}

function draftFromSearchParams(sp: URLSearchParams): Draft {
  const paidRaw = sp.get("paid");
  const paid: Draft["paid"] = paidRaw === "yes" || paidRaw === "no" ? paidRaw : "all";
  const ao = sp.get("approvalOverdue");
  const po = sp.get("pickupOverdue");
  return {
    statusFilter: normalizeQuery(sp.get("status")) ?? "all",
    orderType: normalizeQuery(sp.get("orderType")) ?? "all",
    technician: normalizeQuery(sp.get("technician")) ?? "all",
    paid,
    supplier: normalizeQuery(sp.get("supplier")) ?? "all",
    dateFrom: normalizeQuery(sp.get("dateFrom")) ?? "",
    dateTo: normalizeQuery(sp.get("dateTo")) ?? "",
    approvalOverdue: ao === "1" || ao === "true",
    pickupOverdue: po === "1" || po === "true",
  };
}

function buildApplyHref(current: URLSearchParams, d: Draft): string {
  const p = new URLSearchParams();
  const q = normalizeQuery(current.get("q"));
  if (q) p.set("q", q);

  const tabRaw = normalizeQuery(current.get("tab"));
  const tabParsed: OrderStatusTab = parseOrderStatusTab(tabRaw);

  if (d.statusFilter !== "all") {
    p.set("status", d.statusFilter);
  } else if (tabParsed !== "all") {
    p.set("tab", tabParsed);
  }

  if (d.orderType !== "all") p.set("orderType", d.orderType);
  if (d.technician !== "all") p.set("technician", d.technician);
  if (d.paid !== "all") p.set("paid", d.paid);
  if (d.supplier !== "all") p.set("supplier", d.supplier);
  if (d.dateFrom.trim()) p.set("dateFrom", d.dateFrom.trim());
  if (d.dateTo.trim()) p.set("dateTo", d.dateTo.trim());
  if (d.approvalOverdue) p.set("approvalOverdue", "1");
  if (d.pickupOverdue) p.set("pickupOverdue", "1");

  const s = p.toString();
  return s ? `/orders?${s}` : "/orders";
}

function buildResetHref(current: URLSearchParams): string {
  const q = normalizeQuery(current.get("q"));
  if (!q) return "/orders";
  return `/orders?q=${encodeURIComponent(q)}`;
}

function chipActive(active: boolean) {
  return cn(
    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-border bg-surface-muted text-muted-foreground hover:text-foreground",
  );
}

type Props = {
  technicianOptions: string[];
};

export function OrdersFilterSheet({ technicianOptions }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const spString = sp.toString();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromSearchParams(new URLSearchParams(spString)));
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFromSearchParams(new URLSearchParams(spString)));
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d: { items?: SupplierOption[] }) => setSuppliers(d.items ?? []))
      .catch(() => setSuppliers([]));
  }, [open, spString]);

  const hasActiveFilters = useMemo(() => {
    const cur = new URLSearchParams(spString);
    const d = draftFromSearchParams(cur);
    const tab = parseOrderStatusTab(normalizeQuery(cur.get("tab")));
    const hasTab = tab !== "all";
    return (
      hasTab ||
      d.statusFilter !== "all" ||
      d.orderType !== "all" ||
      d.technician !== "all" ||
      d.paid !== "all" ||
      d.supplier !== "all" ||
      Boolean(d.dateFrom) ||
      Boolean(d.dateTo) ||
      d.approvalOverdue ||
      d.pickupOverdue
    );
  }, [spString]);

  const apply = useCallback(() => {
    const href = buildApplyHref(new URLSearchParams(spString), draft);
    router.push(href);
    setOpen(false);
  }, [draft, router, spString]);

  const reset = useCallback(() => {
    const href = buildResetHref(new URLSearchParams(spString));
    router.push(href);
    setOpen(false);
  }, [router, spString]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="打开筛选"
        className="ui-btn ui-btn-secondary relative inline-flex h-10 min-h-10 flex-1 items-center justify-center gap-1.5 px-3 text-sm sm:h-9 sm:min-h-0 sm:min-w-[5.5rem] sm:flex-none"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Filter className="size-3.5 shrink-0" aria-hidden />
        <span>筛选</span>
        {hasActiveFilters ? (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
        ) : null}
      </button>

      <OverlayPortal
        className="fixed inset-0 z-[70] flex justify-end bg-background/80 sm:items-center sm:justify-center sm:p-4"
        lockBodyScroll
        onBackdropClick={() => setOpen(false)}
        open={open}
      >
        <div
          aria-modal
          className="flex h-full w-full max-w-md flex-col border-border bg-card shadow-[var(--shadow-elevated)] sm:h-auto sm:max-h-[min(90dvh,720px)] sm:rounded-2xl sm:border"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="font-display text-base font-semibold text-foreground">筛选工单</h2>
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={reset}
                type="button"
              >
                重置
              </button>
              <button
                aria-label="关闭筛选"
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
            <section>
              <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                工单状态（单选）
              </h3>
              <p className="mb-2 text-[11px] text-muted-foreground">
                选择具体状态时会清除顶部分段 Tab，仅按该状态筛选。
              </p>
              <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
                <button
                  className={chipActive(draft.statusFilter === "all")}
                  onClick={() => setDraft((d) => ({ ...d, statusFilter: "all" }))}
                  type="button"
                >
                  不限
                </button>
                {ORDER_STATUS_SELECT_SEQUENCE.map((code) => (
                  <button
                    key={code}
                    className={chipActive(draft.statusFilter === code)}
                    onClick={() => setDraft((d) => ({ ...d, statusFilter: code }))}
                    type="button"
                  >
                    {ORDER_STATUS_LABELS[code] ?? code}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                工单类型
              </h3>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { v: "all", l: "全部" },
                    { v: "dropoff_repair", l: "送修" },
                    { v: "quick_repair", l: "快修" },
                  ] as const
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    className={chipActive(draft.orderType === v)}
                    onClick={() => setDraft((d) => ({ ...d, orderType: v }))}
                    type="button"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                付款
              </h3>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { v: "all" as const, l: "全部" },
                    { v: "yes" as const, l: "已结清" },
                    { v: "no" as const, l: "未结清" },
                  ] as const
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    className={chipActive(draft.paid === v)}
                    onClick={() => setDraft((d) => ({ ...d, paid: v }))}
                    type="button"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                技师
              </h3>
              <select
                className="ui-input h-10 w-full text-sm"
                onChange={(e) => setDraft((d) => ({ ...d, technician: e.target.value }))}
                value={draft.technician}
              >
                <option value="all">全部</option>
                {technicianOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                外修供应商
              </h3>
              <select
                className="ui-input h-10 w-full text-sm"
                onChange={(e) => setDraft((d) => ({ ...d, supplier: e.target.value }))}
                value={draft.supplier}
              >
                <option value="all">全部</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.short_name}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                创建日期
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                  起
                  <input
                    className="ui-input h-10 text-sm"
                    onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                    type="date"
                    value={draft.dateFrom}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                  止
                  <input
                    className="ui-input h-10 text-sm"
                    onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                    type="date"
                    value={draft.dateTo}
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                风险 / 超期
              </h3>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  checked={draft.approvalOverdue}
                  className="size-4 rounded border-border"
                  onChange={(e) => setDraft((d) => ({ ...d, approvalOverdue: e.target.checked }))}
                  type="checkbox"
                />
                报价待确认超期
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  checked={draft.pickupOverdue}
                  className="size-4 rounded border-border"
                  onChange={(e) => setDraft((d) => ({ ...d, pickupOverdue: e.target.checked }))}
                  type="checkbox"
                />
                完工未取/未通知超期
              </label>
            </section>
          </div>

          <footer className="shrink-0 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glass)] transition-[box-shadow] hover:shadow-[var(--glow-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={apply}
              style={{ background: "var(--gradient-brand)" }}
              type="button"
            >
              应用筛选
            </button>
          </footer>
        </div>
      </OverlayPortal>
    </>
  );
}
