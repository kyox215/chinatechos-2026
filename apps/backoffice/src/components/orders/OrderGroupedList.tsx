"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { IconChevronDown } from "@/components/icons";
import { OrderListMoneyCell } from "@/components/orders/OrderListMoneyCell";
import { StatusPopover } from "@/components/orders/StatusPopover";
import { SupplierBadge } from "@/components/orders/SupplierBadge";
import { SupplierPickerModal } from "@/components/orders/SupplierPickerModal";
import { useResolvedOrderUi } from "@/components/order-ui/OrderUiProvider";
import type { OrderListItem } from "@/lib/data/orders";
import {
  getOrderStatusSelectOptionsResolved,
  getStatusListSortIndexResolved,
  type ResolvedOrderUi,
} from "@/lib/domain/order-ui-config";
import { calcWarranty } from "@/lib/domain/warranty-calc";
import { postOrdersBatchTransition } from "@/lib/api/order-transition-client";
import { formatOrderEUR } from "@/lib/domain/order-money";

type StatusGroup = {
  key: string;
  label: string;
  items: OrderListItem[];
  defaultOpen: boolean;
  titleColor: string;
  bgColor: string;
};

const DESKTOP_GRID =
  "grid min-w-[960px] grid-cols-[36px_86px_minmax(120px,150px)_minmax(180px,1fr)_minmax(126px,150px)_minmax(86px,116px)_minmax(72px,96px)_minmax(132px,164px)] gap-x-2";

function sortOrderItemsInGroup(bucket: OrderListItem[], resolved: ResolvedOrderUi): OrderListItem[] {
  return [...bucket].sort((a, b) => {
    const rankDiff =
      getStatusListSortIndexResolved(a.status, resolved) -
      getStatusListSortIndexResolved(b.status, resolved);
    if (rankDiff !== 0) return rankDiff;
    const tu = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (tu !== 0) return tu;
    return b.id.localeCompare(a.id);
  });
}

/** 大分组配置来自门店设置（resolvedOrderUi.macroGroups） */
function macroGroups(items: OrderListItem[], resolved: ResolvedOrderUi): StatusGroup[] {
  const groups: StatusGroup[] = [];
  const assigned = new Set<string>();
  for (const spec of resolved.macroGroups) {
    const statusSet = new Set(spec.statuses);
    const raw = items.filter((it) => statusSet.has(it.status) && !assigned.has(it.id));
    for (const it of raw) assigned.add(it.id);
    groups.push({
      key: spec.id,
      label: spec.label,
      items: sortOrderItemsInGroup(raw, resolved),
      defaultOpen: spec.defaultOpenDesktop,
      titleColor: spec.titleColor,
      bgColor: spec.bgColor,
    });
  }
  const misc = items.filter((it) => !assigned.has(it.id));
  if (misc.length > 0) {
    groups.push({
      key: "other",
      label: "其他",
      items: sortOrderItemsInGroup(misc, resolved),
      defaultOpen: true,
      titleColor: "text-neutral-700",
      bgColor: "bg-neutral-100",
    });
  }
  return groups;
}

function ReworkWarrantyBadges({ item }: { item: OrderListItem }) {
  if (!item.originalOrderId) return null;
  const w = calcWarranty(item.originalOrderCompletedAt, item.originalOrderWarrantyText);
  return (
    <span className="flex shrink-0 flex-wrap items-center gap-1">
      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">返修</span>
      {w ? (
        w.isInWarranty ? (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
            保修剩余 {w.remainingDays} 天
          </span>
        ) : (
          <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
            保修已过期
          </span>
        )
      ) : (
        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
          保修信息不全
        </span>
      )}
    </span>
  );
}

export function OrderGroupedList({ items }: { items: OrderListItem[] }) {
  const router = useRouter();
  const ui = useResolvedOrderUi();
  const groups = macroGroups(items, ui);
  const statusOptions = getOrderStatusSelectOptionsResolved(ui);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState("");
  const [batchPending, setBatchPending] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [supplierModalItem, setSupplierModalItem] = useState<OrderListItem | null>(null);
  const [supplierAnchorEl, setSupplierAnchorEl] = useState<HTMLElement | null>(null);

  function openSupplierPicker(item: OrderListItem, anchor: HTMLElement | null) {
    setSupplierModalItem(item);
    setSupplierAnchorEl(anchor);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(groupItems: OrderListItem[]) {
    const ids = groupItems.map((i) => i.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleBatchTransition() {
    if (selected.size === 0 || !batchStatus) return;
    setBatchPending(true);
    setBatchError(null);
    const orderIds = [...selected];
    try {
      const data = await postOrdersBatchTransition({
        orderIds,
        toStatus: batchStatus,
      });
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
      console.error("[OrderGroupedList] batch transition failed", e);
    } finally {
      setBatchPending(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-2 px-4 py-10 text-center">
        <div className="text-sm font-semibold text-neutral-900">暂无工单</div>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-neutral-500">
          当前筛选条件下没有记录，可以清空筛选或新建工单。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <GroupSection
          key={group.key}
          group={group}
          selected={selected}
          onOpenSupplierPicker={openSupplierPicker}
          onToggleSelect={toggleSelect}
          onToggleGroup={() => toggleGroup(group.items)}
        />
      ))}

      {selected.size > 0 && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 grid w-[calc(100vw-1rem)] max-w-3xl -translate-x-1/2 grid-cols-2 items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-3 shadow-lg sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:px-4">
          <span className="col-span-2 text-center text-sm font-medium text-neutral-900 sm:col-span-1">
            已选 {selected.size} 个
          </span>
          <select
            className="ui-input col-span-2 h-10 text-xs sm:col-span-1 md:h-8"
            onChange={(e) => setBatchStatus(e.target.value)}
            value={batchStatus}
          >
            <option value="">选择目标状态</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            className="ui-btn ui-btn-primary h-10 px-4 text-xs md:h-8"
            disabled={!batchStatus || batchPending}
            onClick={() => void handleBatchTransition()}
            type="button"
          >
            {batchPending ? "处理中..." : "批量切换"}
          </button>
          {batchError ? (
            <span className="w-full basis-full text-center text-[11px] text-rose-600 sm:w-auto">{batchError}</span>
          ) : null}
          <button
            className="ui-btn ui-btn-secondary h-10 px-3 text-xs md:h-8"
            onClick={() => setSelected(new Set())}
            type="button"
          >
            取消选择
          </button>
        </div>
      )}

      <SupplierPickerModal
        anchorEl={supplierAnchorEl}
        initialSupplierId={supplierModalItem?.supplierId ?? null}
        open={supplierModalItem != null}
        orderId={supplierModalItem?.id ?? ""}
        publicNo={supplierModalItem?.publicNo ?? ""}
        onClose={() => { setSupplierModalItem(null); setSupplierAnchorEl(null); }}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

const GroupSection = memo(function GroupSection({
  group,
  selected,
  onToggleSelect,
  onToggleGroup,
  onOpenSupplierPicker,
}: {
  group: StatusGroup;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleGroup: () => void;
  onOpenSupplierPicker: (item: OrderListItem, anchor: HTMLElement | null) => void;
}) {
  const [open, setOpen] = useState(group.defaultOpen);

  const allSelected = group.items.length > 0 && group.items.every((i) => selected.has(i.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm max-lg:overflow-visible max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none">
      <div className={`flex items-center px-3 py-2.5 max-lg:hidden md:px-4 ${group.bgColor}`}>
        <input
          checked={allSelected}
          className="mr-3 h-5 w-5 rounded border-neutral-300 md:h-4 md:w-4"
          onChange={onToggleGroup}
          type="checkbox"
        />
        <button
          aria-expanded={open}
          className="flex min-h-10 flex-1 items-center justify-between gap-3 text-left md:min-h-8"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${group.titleColor}`}>{group.label}</span>
            <span className="rounded-full border border-border/60 bg-surface/80 px-2 py-0.5 text-xs font-medium text-neutral-600">
              {group.items.length}
            </span>
          </div>
          <IconChevronDown
            className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {group.items.length === 0 ? (
        open ? (
          <div className="hidden border-t border-border bg-surface-2 px-3 py-8 text-center text-sm text-neutral-500 lg:block">
            本分组暂无工单
          </div>
        ) : null
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {group.items.map((it) => {
              const phoneHref = telHrefFromDisplay(it.customerPhone);
              const cust = it.customerName?.trim();
              const iss = it.issue?.trim();
              const secondaryParts: string[] = [];
              if (cust && cust !== "-") secondaryParts.push(cust);
              if (iss && iss !== "-") secondaryParts.push(iss);
              const secondaryLine = secondaryParts.length > 0 ? secondaryParts.join(" · ") : "—";
              const supplierLabel =
                it.supplierShortName != null && it.supplierShortName !== ""
                  ? `更改供应商（当前 ${it.supplierShortName}）`
                  : "选择供应商";
              const primaryAmount =
                it.balanceAmount && it.balanceAmount > 0 ? it.balanceAmount : it.quotationAmount;

              return (
                <article
                  key={it.id}
                  className={`min-w-0 rounded-2xl border border-border border-l-[3px] border-l-[#22cfe0] bg-surface/88 px-4 py-4 shadow-[0_8px_24px_rgba(40,89,120,0.10)] transition-shadow ${selected.has(it.id) ? "ring-2 ring-primary/30" : ""}`}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <input
                      checked={selected.has(it.id)}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-neutral-300"
                      onChange={() => onToggleSelect(it.id)}
                      type="checkbox"
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Link
                              className="block truncate text-sm font-semibold tabular-nums text-primary underline-offset-2 hover:underline"
                              href={`/orders/${it.id}`}
                            >
                              {it.publicNo}
                            </Link>
                            <span className="rounded-full border border-border bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                              {getOrderTypeLabel(it.orderType)}
                            </span>
                          </div>
                        </div>
                        <StatusPopover orderId={it.id} status={it.status} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="min-w-0 truncate text-[15px] font-semibold leading-snug text-neutral-950">
                            {(cust && cust !== "-" ? `${cust} · ` : "") + (it.deviceLabel || "-")}
                          </div>
                          <ReworkWarrantyBadges item={it} />
                        </div>
                        {phoneHref ? (
                          <a
                            className="block w-fit max-w-full break-all text-sm font-medium tabular-nums leading-snug text-neutral-500 no-underline underline-offset-2 hover:underline active:opacity-80"
                            href={phoneHref}
                          >
                            {it.customerPhone || "-"}
                          </a>
                        ) : (
                          <span className="block max-w-full break-all text-sm font-medium tabular-nums leading-snug text-neutral-500">
                            {it.customerPhone || "-"}
                          </span>
                        )}
                      </div>

                      <p className="line-clamp-2 text-sm leading-6 text-neutral-600">
                        {iss && iss !== "-" ? iss : secondaryLine}
                      </p>

                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
                        <span className="min-w-0 truncate">{it.technicianName ?? "-"}</span>
                        <span className="text-neutral-300">·</span>
                        <span className="tabular-nums">{fmtDateOnly(it.createdAt)}</span>
                        <span className="ml-auto text-base font-semibold tabular-nums text-neutral-950">
                          {formatOrderEUR(primaryAmount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                        <div className="min-w-0">
                          <button
                            aria-label={supplierLabel}
                            className="inline-flex h-10 max-w-full items-center gap-1 rounded-xl border border-border bg-surface-2 px-3 text-left text-[11px] font-medium text-neutral-700 transition-colors hover:bg-muted/80 active:bg-muted"
                            type="button"
                            onClick={(e) => onOpenSupplierPicker(it, e.currentTarget)}
                          >
                            {it.supplierShortName ? (
                              <span className="min-w-0 truncate">
                                <SupplierBadge color={it.supplierColor} name={it.supplierShortName} size="sm" />
                              </span>
                            ) : (
                              <span className="text-neutral-500">选择</span>
                            )}
                          </button>
                        </div>
                        <Link
                          className="inline-flex h-10 shrink-0 items-center rounded-xl border border-border bg-surface-2 px-3 text-xs font-semibold text-neutral-700 hover:bg-muted"
                          href={`/orders/${it.id}`}
                        >
                          详情
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {open ? (
            <div className="hidden overflow-x-auto lg:block">
              <div className={`${DESKTOP_GRID} border-t border-border bg-surface px-3 py-2.5 text-xs font-semibold text-neutral-500`}>
                <div />
                <div>状态</div>
                <div>工单 / 电话</div>
                <div>客户 / 设备</div>
                <div>财务</div>
                <div>供应商</div>
                <div>技师</div>
                <div className="text-right">操作</div>
              </div>

              {group.items.map((it, rowIdx) => (
                <div
                  key={it.id}
                  className={`${DESKTOP_GRID} items-start border-t border-border px-3 py-3 transition-colors hover:bg-muted/20 ${
                    selected.has(it.id)
                      ? "bg-primary-2/35"
                      : rowIdx % 2 === 1
                        ? "bg-muted/15"
                        : ""
                  }`}
                >
                  <div className="flex items-center pt-1">
                    <input
                      checked={selected.has(it.id)}
                      className="h-4 w-4 rounded border-neutral-300"
                      onChange={() => onToggleSelect(it.id)}
                      type="checkbox"
                    />
                  </div>
                  <div className="flex items-start pt-1">
                    <StatusPopover orderId={it.id} status={it.status} />
                  </div>
                  <div className="min-w-0 space-y-0.5 pt-1 leading-snug">
                    <Link
                      className="block truncate text-xs font-semibold tabular-nums text-primary underline-offset-2 hover:underline"
                      href={`/orders/${it.id}`}
                    >
                      {it.publicNo}
                    </Link>
                    <div className="truncate text-xs font-medium tabular-nums text-neutral-700">
                      {it.customerPhone || "-"}
                    </div>
                  </div>
                  <div className="min-w-0 space-y-0.5 pr-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="min-w-0 truncate text-base font-semibold text-neutral-900">
                        {it.deviceLabel || "-"}
                      </span>
                      <ReworkWarrantyBadges item={it} />
                    </div>
                    <div className="truncate text-xs text-neutral-500">{it.customerName ?? "-"}</div>
                    <div className="break-words text-xs leading-snug text-neutral-400 line-clamp-2">{it.issue || "-"}</div>
                  </div>
                  <div className="min-w-0">
                    <OrderListMoneyCell
                      money={{
                        quotationAmount: it.quotationAmount,
                        depositAmount: it.depositAmount,
                        balanceAmount: it.balanceAmount,
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 items-start pt-1">
                    <button
                      className="inline-flex max-w-full min-h-[28px] items-center gap-1 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-muted/70 active:bg-muted"
                      title="点击选择供应商"
                      type="button"
                      onClick={(e) => onOpenSupplierPicker(it, e.currentTarget)}
                    >
                      {it.supplierShortName ? (
                        <SupplierBadge color={it.supplierColor} name={it.supplierShortName} />
                      ) : (
                        <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-400">选择</span>
                      )}
                    </button>
                  </div>
                  <div className="truncate pt-1 text-xs text-neutral-500">{it.technicianName ?? "-"}</div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <span className="whitespace-nowrap text-xs text-neutral-500">{fmtDate(it.createdAt)}</span>
                    <Link
                      className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium leading-8 text-neutral-600 hover:bg-muted"
                      href={`/orders/${it.id}`}
                    >
                      详情
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
});

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

function fmtDateOnly(v: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(v));
}

function getOrderTypeLabel(orderType: string) {
  if (orderType === "quick_repair") return "快修";
  if (orderType === "dropoff_repair") return "送修";
  if (orderType === "rework") return "返修";
  return orderType || "工单";
}

/** Build tel: href when the stored phone looks dialable (digits, optional leading +). */
function telHrefFromDisplay(phone: string | null | undefined): string | null {
  const raw = phone?.trim();
  if (!raw || raw === "-") return null;
  const normalized = raw.replace(/\s/g, "");
  if (!/^\+?[0-9]{8,}$/.test(normalized)) return null;
  return `tel:${normalized}`;
}
