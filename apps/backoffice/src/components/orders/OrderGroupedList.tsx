"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useLayoutEffect, useState } from "react";
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

type StatusGroup = {
  key: string;
  label: string;
  items: OrderListItem[];
  defaultOpen: boolean;
  titleColor: string;
  bgColor: string;
};

const DESKTOP_GRID =
  "grid grid-cols-[32px_76px_minmax(90px,130px)_minmax(140px,1fr)_120px_68px_56px_minmax(120px,160px)] gap-x-1.5";

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
    const raw = items.filter((it) => statusSet.has(it.status));
    for (const it of raw) assigned.add(it.id);
    if (raw.length > 0) {
      groups.push({
        key: spec.id,
        label: spec.label,
        items: sortOrderItemsInGroup(raw, resolved),
        defaultOpen: spec.defaultOpenDesktop,
        titleColor: spec.titleColor,
        bgColor: spec.bgColor,
      });
    }
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
    try {
      const res = await fetch("/api/orders/batch-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [...selected], toStatus: batchStatus }),
      });
      await res.json();
      setSelected(new Set());
      setBatchStatus("");
      router.refresh();
    } finally {
      setBatchPending(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border px-3 py-8 text-sm text-neutral-500">
        暂无工单数据（请先配置 Supabase 并写入 repair_orders）。
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
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg sm:gap-3">
          <span className="text-sm font-medium text-neutral-900">已选 {selected.size} 个</span>
          <select
            className="ui-input h-8 text-xs"
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
            className="h-8 rounded-lg bg-primary px-4 text-xs font-semibold text-white disabled:opacity-60"
            disabled={!batchStatus || batchPending}
            onClick={handleBatchTransition}
            type="button"
          >
            {batchPending ? "处理中..." : "批量切换"}
          </button>
          <button
            className="h-8 rounded-lg border border-border px-3 text-xs text-neutral-600 hover:bg-muted"
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

  /** 与 Tailwind `lg` 一致：<1024px 为移动端卡片列表，分组初始收起 */
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    if (mq.matches) setOpen(false);
  }, [group.key]);

  const allSelected = group.items.length > 0 && group.items.every((i) => selected.has(i.id));

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className={`flex items-center px-3 py-2 ${group.bgColor}`}>
        <input
          checked={allSelected}
          className="mr-3 h-4 w-4 rounded border-neutral-300"
          onChange={onToggleGroup}
          type="checkbox"
        />
        <button
          className="flex flex-1 items-center justify-between text-left"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${group.titleColor}`}>{group.label}</span>
            <span className="rounded-lg bg-white/60 px-2 py-0.5 text-xs font-medium text-neutral-600">
              {group.items.length}
            </span>
          </div>
          <svg
            className={`h-4 w-4 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <>
          <div className="space-y-1.5 border-t border-border bg-surface-2 p-2.5 lg:hidden">
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

              return (
              <article
                key={it.id}
                className={`min-w-0 rounded-[10px] border border-border bg-surface px-3 py-2.5 ${selected.has(it.id) ? "ring-2 ring-indigo-300/60" : "shadow-sm"}`}
              >
                <div className="flex min-w-0 items-start gap-2">
                  <input
                    checked={selected.has(it.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300"
                    onChange={() => onToggleSelect(it.id)}
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="border-b border-border pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <StatusPopover orderId={it.id} status={it.status} />
                        <div className="min-w-0 flex-1">
                          {phoneHref ? (
                            <a
                              className="block max-w-full break-all text-end text-sm font-semibold tabular-nums leading-snug text-neutral-800 no-underline underline-offset-2 hover:underline active:opacity-80"
                              href={phoneHref}
                            >
                              {it.customerPhone || "-"}
                            </a>
                          ) : (
                            <span className="block max-w-full break-all text-end text-sm font-semibold tabular-nums leading-snug text-neutral-800">
                              {it.customerPhone || "-"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="min-w-0 truncate text-base font-semibold leading-snug text-neutral-900">
                          {it.deviceLabel || "-"}
                        </div>
                        <ReworkWarrantyBadges item={it} />
                      </div>
                      <p className="line-clamp-2 text-xs leading-snug text-neutral-600">{secondaryLine}</p>
                    </div>

                    <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-snug text-neutral-600">
                        <span className="shrink-0 text-neutral-400">技师</span>
                        <span className="min-w-0 max-w-[42%] truncate sm:max-w-[50%]">{it.technicianName ?? "-"}</span>
                        <span className="shrink-0 text-neutral-300">·</span>
                        <span className="shrink-0 text-neutral-400">供应商</span>
                        <button
                          aria-label={supplierLabel}
                          className="inline-flex h-7 max-w-[min(65%,12rem)] shrink items-center gap-1 rounded-md border border-border bg-surface px-2 text-left text-[11px] font-medium text-neutral-700 transition-colors hover:bg-muted/80 active:bg-muted"
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
                    </div>

                    <div className="rounded-lg border border-border/80 bg-surface px-2 py-1.5 shadow-sm">
                      <OrderListMoneyCell
                        className="justify-start"
                        compact
                        money={{
                          quotationAmount: it.quotationAmount,
                          depositAmount: it.depositAmount,
                          balanceAmount: it.balanceAmount,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[11px] tabular-nums text-neutral-500">创建：{fmtDate(it.createdAt)}</span>
                      <Link
                        className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-neutral-700 hover:bg-muted"
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

          <div className="hidden lg:block">
              <div className={`${DESKTOP_GRID} border-t border-border bg-surface px-3 py-2.5 text-xs font-semibold text-neutral-500`}>
                <div />
                <div>状态</div>
                <div>电话</div>
                <div>客户 / 设备</div>
                <div>财务</div>
                <div>供应商</div>
                <div>技师</div>
                <div className="text-right">操作</div>
              </div>

              {group.items.map((it, rowIdx) => (
                <div
                  key={it.id}
                  className={`${DESKTOP_GRID} items-start border-t border-border px-3 py-2.5 ${
                    selected.has(it.id)
                      ? "bg-indigo-50/50"
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
                  <div className="min-w-0 truncate pt-1 text-xs font-medium leading-snug text-neutral-900">{it.customerPhone || "-"}</div>
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
                      className="h-7 rounded-lg border border-border bg-surface px-2 text-xs font-medium leading-7 text-neutral-600 hover:bg-muted"
                      href={`/orders/${it.id}`}
                    >
                      详情
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
});

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

/** Build tel: href when the stored phone looks dialable (digits, optional leading +). */
function telHrefFromDisplay(phone: string | null | undefined): string | null {
  const raw = phone?.trim();
  if (!raw || raw === "-") return null;
  const normalized = raw.replace(/\s/g, "");
  if (!/^\+?[0-9]{8,}$/.test(normalized)) return null;
  return `tel:${normalized}`;
}
