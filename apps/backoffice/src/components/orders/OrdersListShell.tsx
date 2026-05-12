"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  MoreHorizontal,
  Printer,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/animated-number";
import { OrderListMoneyCell } from "@/components/orders/OrderListMoneyCell";
import { OrdersListSearchDraftProvider } from "@/components/orders/orders-list-search-draft-context";
import { StatusPopover } from "@/components/orders/StatusPopover";
import { useResolvedOrderUi } from "@/components/order-ui/OrderUiProvider";
import { postOrdersBatchTransition } from "@/lib/api/order-transition-client";
import type { OrderListItem } from "@/lib/data/orders";
import {
  ORDER_LIST_TAB_LABELS,
  type OrderStatusTab,
} from "@/lib/domain/order-list-tabs";
import { getOrderStatusSelectOptionsResolved } from "@/lib/domain/order-ui-config";
import { calcWarranty } from "@/lib/domain/warranty-calc";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type CustomerSuggestion = {
  id: string;
  name: string | null;
  phoneE164: string;
  lastOrderAt: string | null;
};

const TABS: OrderStatusTab[] = [
  "all",
  "in_progress",
  "awaiting_approval",
  "awaiting_pickup",
  "completed",
  "cancelled",
];

function buildOrdersHref(nextTab: OrderStatusTab, sp: URLSearchParams): string {
  const p = new URLSearchParams(sp.toString());
  if (nextTab === "all") {
    p.delete("tab");
  } else {
    p.set("tab", nextTab);
  }
  p.delete("status");
  const q = p.toString();
  return q ? `/orders?${q}` : "/orders";
}

function ReworkWarrantyBadges({ item }: { item: OrderListItem }) {
  if (!item.originalOrderId) return null;
  const w = calcWarranty(item.originalOrderCompletedAt, item.originalOrderWarrantyText);
  return (
    <span className="flex shrink-0 flex-wrap items-center gap-1">
      <span className="rounded-full bg-status-danger px-1.5 py-0.5 text-[10px] font-medium text-status-danger-foreground">
        返修
      </span>
      {w ? (
        w.isInWarranty ? (
          <span className="rounded-full bg-status-success px-1.5 py-0.5 text-[10px] font-medium text-status-success-foreground">
            保修剩余 {w.remainingDays} 天
          </span>
        ) : (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            保修已过期
          </span>
        )
      ) : (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          保修信息不全
        </span>
      )}
    </span>
  );
}

function OrderTypeTag({ type }: { type: string }) {
  const label = type === "dropoff_repair" ? "送修" : "快修";
  return (
    <span className="inline-flex items-center rounded-md border border-border/60 bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

type KpiTone = "violet" | "cyan" | "warn";

function kpiGlowColor(tone: KpiTone): string {
  switch (tone) {
    case "violet":
      return "var(--color-brand-violet)";
    case "cyan":
      return "var(--color-brand-cyan)";
    case "warn":
      return "var(--status-warn-foreground)";
  }
}

/** 列表页 KPI：与规划稿一致，仅用语义 / 品牌 Token（不写死 hex） */
function KpiPill({ label, value, tone }: { label: string; value: number; tone: KpiTone }) {
  const glow = kpiGlowColor(tone);
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass-card group relative overflow-hidden px-3 py-2"
      transition={{ duration: 0.2 }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-80"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${glow} 55%, transparent) 0%, transparent 70%)`,
        }}
      />
      <div className="relative flex items-center gap-3">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: glow }} />
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">{label}</div>
          <div className="font-display text-lg font-semibold tabular-nums leading-none">
            <AnimatedNumber value={value} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

type Props = {
  items: OrderListItem[];
  tab: OrderStatusTab;
  listError?: string;
  kpiToday: number;
  kpiInProgress: number;
  kpiUnpaid: number;
  filtersSlot: React.ReactNode;
};

export function OrdersListShell(props: Props) {
  const { items, tab, listError, kpiToday, kpiInProgress, kpiUnpaid, filtersSlot } = props;
  const router = useRouter();
  const sp = useSearchParams();
  const ui = useResolvedOrderUi();
  const statusOptions = getOrderStatusSelectOptionsResolved(ui);

  const [localQ, setLocalQ] = useState(() => sp.get("q") ?? "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState("");
  const [batchPending, setBatchPending] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const searchListboxId = useId();
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const spString = sp.toString();

  useEffect(() => {
    setLocalQ(sp.get("q") ?? "");
  }, [sp]);

  useEffect(() => {
    const keyword = localQ.trim();
    if (keyword.length < 2) {
      queueMicrotask(() => setSuggestions([]));
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const response = await fetch(`/api/customers/suggest?q=${encodeURIComponent(keyword)}&limit=10`);
        if (!response.ok) {
          setSuggestions([]);
          return;
        }
        const json = (await response.json()) as { items?: CustomerSuggestion[] };
        setSuggestions(json.items ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggest(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [localQ]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileFiltersOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const closeIfDesktop = () => {
      if (mq.matches) setMobileFiltersOpen(false);
    };
    closeIfDesktop();
    mq.addEventListener("change", closeIfDesktop);
    return () => mq.removeEventListener("change", closeIfDesktop);
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileFiltersOpen]);

  const applySearch = useCallback(() => {
    const p = new URLSearchParams(spString);
    const t = localQ.trim();
    if (t) p.set("q", t);
    else p.delete("q");
    const s = p.toString();
    router.push(s ? `/orders?${s}` : "/orders");
  }, [localQ, router, spString]);

  const allSelected = items.length > 0 && selected.size === items.length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  async function handleBatchTransition() {
    if (selected.size === 0 || !batchStatus) return;
    setBatchPending(true);
    setBatchError(null);
    const orderIds = [...selected];
    try {
      const data = await postOrdersBatchTransition({ orderIds, toStatus: batchStatus });
      const total = data.total ?? orderIds.length;
      const okCount = data.successCount ?? 0;
      if (okCount === total && total > 0) {
        setSelected(new Set());
        setBatchStatus("");
        router.refresh();
        return;
      }
      const failed = (data.results ?? []).filter((r) => !r.ok);
      const sample = failed
        .slice(0, 3)
        .map((r) => r.error ?? r.id)
        .join("；");
      setBatchError(`部分失败：成功 ${okCount}/${total}${sample ? `（${sample}）` : ""}`);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "批量流转失败";
      setBatchError(msg);
    } finally {
      setBatchPending(false);
    }
  }

  const tabLinks = useMemo(
    () =>
      TABS.map((t) => ({
        key: t,
        label: ORDER_LIST_TAB_LABELS[t],
        href: buildOrdersHref(t, new URLSearchParams(spString)),
        active: tab === t,
      })),
    [spString, tab],
  );

  return (
    <div className="space-y-6">
      <motion.header
        animate="show"
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        initial="hidden"
        variants={stagger(0.05)}
      >
        <motion.div variants={fadeUp}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">工作台 / 工单</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="gradient-text">工单</span>
            <span className="ml-2 align-middle text-base font-normal text-muted-foreground">
              共 <span className="font-mono tabular-nums">{items.length}</span> 条
            </span>
          </h1>
        </motion.div>
        <motion.div className="flex flex-wrap items-stretch gap-2 sm:justify-end" variants={fadeUp}>
          <KpiPill label="今日新建" tone="violet" value={kpiToday} />
          <KpiPill label="进行中" tone="cyan" value={kpiInProgress} />
          <KpiPill label="未结清" tone="warn" value={kpiUnpaid} />
        </motion.div>
      </motion.header>

      {listError ? (
        <div className="rounded-xl border border-border bg-status-danger/10 px-3 py-2 text-sm text-status-danger-foreground">
          列表加载失败：{listError}
        </div>
      ) : null}

      {/* 配方 2：筛选条 — glass-card + 工具栏 */}
      <div className="glass-card flex flex-col gap-3 p-3 shadow-[var(--shadow-card)] sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-autocomplete="list"
              aria-controls={searchFocused && localQ.trim().length >= 2 ? searchListboxId : undefined}
              aria-expanded={Boolean(searchFocused && localQ.trim().length >= 2)}
              autoComplete="off"
              className="ui-input h-9 w-full border-border/60 bg-surface-muted/50 pl-8 text-sm transition-shadow focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25 md:h-9"
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onChange={(e) => setLocalQ(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applySearch();
                }
              }}
              placeholder="搜索工单号、客户姓名、电话或 IMEI"
              role="combobox"
              type="search"
              value={localQ}
            />
            {searchFocused && localQ.trim().length >= 2 ? (
              <div
                className="absolute z-[60] mt-1 w-full rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-elevated)]"
                id={searchListboxId}
                role="listbox"
              >
                {loadingSuggest ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">搜索中...</div>
                ) : suggestions.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">无匹配客户，继续输入可按关键词查工单</div>
                ) : (
                  suggestions.map((it) => (
                    <button
                      key={it.id}
                      className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
                      onClick={() => {
                        const keyword = it.phoneE164 || it.name || "";
                        setLocalQ(keyword);
                        setSearchFocused(false);
                        const p = new URLSearchParams(spString);
                        if (keyword.trim()) p.set("q", keyword.trim());
                        else p.delete("q");
                        const s = p.toString();
                        router.push(s ? `/orders?${s}` : "/orders");
                      }}
                      role="option"
                      type="button"
                    >
                      <div className="text-sm font-medium text-foreground">{it.name ?? "未命名客户"}</div>
                      <div className="text-xs text-muted-foreground">{it.phoneE164}</div>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              className="ui-btn ui-btn-secondary inline-flex h-9 items-center gap-1.5 px-3 text-sm"
              onClick={() => {
                if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
                  document.getElementById("orders-advanced-filters")?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                } else {
                  setMobileFiltersOpen(true);
                }
              }}
              type="button"
            >
              <SlidersHorizontal className="size-3.5" />
              筛选
            </button>
            <button
              className="ui-btn ui-btn-secondary hidden h-9 items-center gap-1.5 px-3 text-sm sm:inline-flex"
              onClick={() => toast.message("导出功能即将上线")}
              type="button"
            >
              <Download className="size-3.5" />
              导出
            </button>
          </div>
        </div>

        {mobileFiltersOpen ? (
          <button
            aria-label="关闭筛选"
            className="fixed inset-0 z-40 bg-background/70 md:hidden"
            onClick={() => setMobileFiltersOpen(false)}
            type="button"
          />
        ) : null}

        <div
          aria-labelledby="orders-filter-sheet-title"
          aria-modal={mobileFiltersOpen ? true : undefined}
          className={cn(
            "border-t border-border/60 pt-3",
            "fixed inset-y-0 right-0 z-50 flex max-h-dvh w-full max-w-sm flex-col border-l border-border bg-card shadow-[var(--shadow-elevated)] transition-transform duration-200 motion-reduce:transition-none md:static md:z-auto md:max-h-none md:max-w-none md:translate-x-0 md:border-0 md:bg-transparent md:shadow-none",
            mobileFiltersOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
            !mobileFiltersOpen && "pointer-events-none md:pointer-events-auto",
          )}
          id="orders-advanced-filters"
          role={mobileFiltersOpen ? "dialog" : undefined}
        >
          <h2 className="sr-only" id="orders-filter-sheet-title">
            筛选
          </h2>
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2.5 md:hidden">
            <span className="text-sm font-semibold text-foreground">高级筛选</span>
            <button
              aria-label="关闭筛选面板"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              onClick={() => setMobileFiltersOpen(false)}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:flex-none md:overflow-visible md:px-0 md:pb-0 md:pt-0">
            <OrdersListSearchDraftProvider draftQ={localQ}>{filtersSlot}</OrdersListSearchDraftProvider>
          </div>
          <div className="shrink-0 border-t border-border p-3 md:hidden">
            <button
              className="ui-btn ui-btn-primary h-10 w-full text-sm font-semibold"
              onClick={() => setMobileFiltersOpen(false)}
              type="button"
            >
              完成
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border/60 bg-surface-muted/50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabLinks.map((t) => (
              <Link
                key={t.key}
                className={cn(
                  "relative shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  t.active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                href={t.href}
                scroll={false}
              >
                {t.active ? (
                  <motion.span
                    className="absolute inset-0 -z-10 rounded-md ring-1 ring-inset ring-border/40"
                    layoutId="orders-tab-indicator"
                    style={{ background: "var(--gradient-brand-soft)" }}
                    transition={{ damping: 32, stiffness: 400, type: "spring" }}
                  />
                ) : null}
                {t.label}
              </Link>
            ))}
          </div>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            选中 <span className="font-mono text-foreground">{selected.size}</span>
          </span>
        </div>
      </div>

      <div className="pb-24">
        {items.length === 0 ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto mt-12 flex max-w-sm flex-col items-center justify-center text-center"
            initial={{ opacity: 0, scale: 0.96 }}
          >
            <div
              className="mb-4 grid size-16 place-items-center rounded-2xl text-primary-foreground shadow-[var(--shadow-elevated)]"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Search className="size-7" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">暂无符合条件的工单</h3>
            <p className="mt-1 text-sm text-muted-foreground">试试调整搜索词或重置筛选条件。</p>
          </motion.div>
        ) : (
          <>
            <div className="glass-card hidden overflow-hidden shadow-[var(--shadow-card)] md:block">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border/40">
                    <th className="w-10 px-4 py-2.5">
                      <input
                        aria-label="全选"
                        checked={allSelected}
                        className="size-4 rounded border-border"
                        onChange={toggleSelectAll}
                        type="checkbox"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">工单号</th>
                    <th className="px-3 py-2.5 text-left font-medium">客户</th>
                    <th className="px-3 py-2.5 text-left font-medium">设备</th>
                    <th className="px-3 py-2.5 text-left font-medium">故障</th>
                    <th className="px-3 py-2.5 text-left font-medium">状态</th>
                    <th className="px-3 py-2.5 text-right font-medium">报价</th>
                    <th className="px-3 py-2.5 text-left font-medium">技师</th>
                    <th className="px-3 py-2.5 text-left font-medium">创建</th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <motion.tbody animate="show" initial="hidden" variants={stagger(0.025)}>
                  {items.map((o) => {
                    const checked = selected.has(o.id);
                    const imeiTail = o.deviceImei && o.deviceImei.length >= 8 ? o.deviceImei.slice(-8) : "—";
                    return (
                      <motion.tr
                        key={o.id}
                        className={cn(
                          "group relative border-b border-border/30 transition-colors hover:bg-accent/30",
                          checked && "bg-accent/40",
                        )}
                        variants={fadeUp}
                      >
                        <td className="relative px-4 py-2.5">
                          <span
                            aria-hidden
                            className={cn(
                              "absolute inset-y-0 left-0 w-0.5 origin-top transition-transform duration-300",
                              checked ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100",
                            )}
                            style={{ background: "var(--gradient-brand)" }}
                          />
                          <input
                            aria-label={`选择 ${o.publicNo}`}
                            checked={checked}
                            className="size-4 rounded border-border"
                            onChange={() => toggleSelect(o.id)}
                            type="checkbox"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            className="font-mono text-xs font-medium text-primary hover:underline"
                            href={`/orders/${o.id}`}
                          >
                            {o.publicNo}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            <OrderTypeTag type={o.orderType} />
                            {o.internalTag ? (
                              <span className="rounded border border-status-warn-foreground/25 bg-status-warn px-1 py-0.5 text-[10px] text-status-warn-foreground">
                                {o.internalTag}
                              </span>
                            ) : null}
                            <ReworkWarrantyBadges item={o} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-foreground">{o.customerName ?? "—"}</div>
                          <div className="font-mono text-xs tabular-nums text-muted-foreground">{o.customerPhone || "—"}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-foreground">{o.deviceLabel || "—"}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{imeiTail}</div>
                        </td>
                        <td className="max-w-[260px] truncate px-3 py-2.5 text-muted-foreground">{o.issue || "—"}</td>
                        <td className="px-3 py-2.5">
                          <StatusPopover orderId={o.id} status={o.status} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <OrderListMoneyCell
                            compact
                            money={{
                              quotationAmount: o.quotationAmount,
                              depositAmount: o.depositAmount,
                              balanceAmount: o.balanceAmount,
                            }}
                          />
                          <div className="text-[11px] text-muted-foreground">{o.isPaid ? "已结清" : "未结清"}</div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{o.technicianName ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(o.createdAt)}</td>
                        <td className="px-2 py-2.5 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              aria-expanded={openMenuId === o.id}
                              aria-haspopup="true"
                              aria-label="更多操作"
                              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                              onClick={() => setOpenMenuId((v) => (v === o.id ? null : o.id))}
                              type="button"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                            {openMenuId === o.id ? (
                              <>
                                <button
                                  aria-label="关闭菜单"
                                  className="fixed inset-0 z-40 cursor-default"
                                  onClick={() => setOpenMenuId(null)}
                                  type="button"
                                />
                                <div className="absolute right-0 z-50 mt-1 min-w-[10rem] rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-[var(--shadow-elevated)]">
                                  <Link
                                    className="block px-3 py-2 text-sm hover:bg-muted"
                                    href={`/orders/${o.id}`}
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    查看详情
                                  </Link>
                                  <button
                                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      toast.message("请从详情页打印");
                                    }}
                                    type="button"
                                  >
                                    <span className="inline-flex items-center gap-2">
                                      <Printer className="size-3.5" /> 打印
                                    </span>
                                  </button>
                                  <button
                                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      toast.message("请从详情页发送通知");
                                    }}
                                    type="button"
                                  >
                                    发送通知
                                  </button>
                                  <button
                                    className="block w-full px-3 py-2 text-left text-sm text-status-danger-foreground hover:bg-muted"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      toast.message("删除功能尚未开放");
                                    }}
                                    type="button"
                                  >
                                    删除
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>

            <motion.div
              animate="show"
              className="space-y-2 md:hidden"
              initial="hidden"
              variants={stagger(0.04)}
            >
              {items.map((o) => (
                <motion.div key={o.id} variants={fadeUp}>
                  <div className="glass-card relative overflow-hidden p-3">
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ background: "var(--gradient-brand)" }}
                    />
                    <div className="flex items-start gap-2 pl-2">
                      <input
                        aria-label={`选择 ${o.publicNo}`}
                        checked={selected.has(o.id)}
                        className="mt-1 size-4 shrink-0 rounded border-border"
                        onChange={() => toggleSelect(o.id)}
                        type="checkbox"
                      />
                      <Link
                        className="min-w-0 flex-1 active:scale-[0.99]"
                        href={`/orders/${o.id}`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-medium text-primary">{o.publicNo}</span>
                          <OrderTypeTag type={o.orderType} />
                          {o.internalTag ? (
                            <span className="rounded border border-status-warn-foreground/25 bg-status-warn px-1 py-0.5 text-[10px] text-status-warn-foreground">
                              {o.internalTag}
                            </span>
                          ) : null}
                          <ReworkWarrantyBadges item={o} />
                        </div>
                        <div className="mt-1 truncate text-sm font-medium text-foreground">
                          {o.customerName ?? "—"}
                          <span className="ml-1.5 text-xs text-muted-foreground">· {o.deviceLabel || "—"}</span>
                        </div>
                        <div className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">{o.customerPhone || "—"}</div>
                        <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{o.issue || "—"}</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <StatusPopover orderId={o.id} status={o.status} />
                          <span className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{o.technicianName ?? "—"}</span>
                          <OrderListMoneyCell
                            compact
                            className="justify-end"
                            money={{
                              quotationAmount: o.quotationAmount,
                              depositAmount: o.depositAmount,
                              balanceAmount: o.balanceAmount,
                            }}
                          />
                        </div>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selected.size > 0 ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center px-3 md:bottom-6"
            exit={{ opacity: 0, y: 80 }}
            initial={{ opacity: 0, y: 80 }}
            transition={{ damping: 30, stiffness: 380, type: "spring" }}
          >
            <div className="glass-strong pointer-events-auto flex max-w-[min(100%,42rem)] flex-wrap items-center gap-2 rounded-xl border border-border px-2 py-2 shadow-[var(--shadow-elevated)]">
              <button
                aria-label="清除选择"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                onClick={() => setSelected(new Set())}
                type="button"
              >
                <X className="size-4" />
              </button>
              <span className="text-sm font-medium text-foreground">
                已选 <span className="gradient-text font-semibold">{selected.size}</span> 条
              </span>
              <span className="hidden h-5 w-px bg-border sm:block" />
              <select
                className="ui-input h-9 max-w-[10rem] text-xs sm:max-w-none"
                onChange={(e) => setBatchStatus(e.target.value)}
                value={batchStatus}
              >
                <option value="">批量流转状态</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                disabled={!batchStatus || batchPending}
                onClick={() => void handleBatchTransition()}
                style={{ background: "var(--gradient-brand)" }}
                type="button"
              >
                {batchPending ? "处理中..." : "应用"}
              </button>
              <button
                className="ui-btn ui-btn-secondary h-9 gap-1 px-3 text-xs"
                onClick={() => toast.message("请从详情页打印")}
                type="button"
              >
                <Printer className="size-3.5" /> 打印
              </button>
              <button
                className="rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                onClick={() => toast.message("请从详情页发送通知")}
                style={{ background: "var(--gradient-brand)" }}
                type="button"
              >
                发送通知
              </button>
              {batchError ? (
                <span className="w-full basis-full text-center text-[11px] text-status-danger-foreground">{batchError}</span>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </div>
  );
}

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(v));
}
