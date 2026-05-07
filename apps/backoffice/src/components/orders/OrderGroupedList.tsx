"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { OrderListMoneyCell } from "@/components/orders/OrderListMoneyCell";
import { StatusPopover } from "@/components/orders/StatusPopover";
import { SupplierBadge } from "@/components/orders/SupplierBadge";
import { SupplierPickerModal } from "@/components/orders/SupplierPickerModal";
import type { OrderListItem } from "@/lib/data/orders";

type StatusGroup = {
  key: string;
  label: string;
  items: OrderListItem[];
  defaultOpen: boolean;
  titleColor: string;
  bgColor: string;
};

const DESKTOP_GRID =
  "grid grid-cols-[32px_92px_128px_minmax(220px,1fr)_150px_92px_72px_180px] gap-x-1.5";

const NEW_STATUSES = new Set(["new"]);
const PROCESSING_STATUSES = new Set(["diagnosing", "quoted", "waiting_approval", "parts_ordered", "parts_arrived"]);
const PICKUP_STATUSES = new Set(["repaired", "notified"]);

function isTerminalOrderStatus(status: string) {
  return status === "completed" || status === "cancelled";
}

function groupOrders(items: OrderListItem[]): StatusGroup[] {
  const newOrders: OrderListItem[] = [];
  const processing: OrderListItem[] = [];
  const pickup: OrderListItem[] = [];
  const ended: OrderListItem[] = [];

  for (const item of items) {
    if (NEW_STATUSES.has(item.status)) newOrders.push(item);
    else if (PROCESSING_STATUSES.has(item.status)) processing.push(item);
    else if (PICKUP_STATUSES.has(item.status)) pickup.push(item);
    else ended.push(item);
  }

  const groups: StatusGroup[] = [];
  if (newOrders.length > 0)
    groups.push({ key: "new", label: "新单", items: newOrders, defaultOpen: true, titleColor: "text-blue-700", bgColor: "bg-blue-50" });
  if (processing.length > 0)
    groups.push({ key: "processing", label: "处理中", items: processing, defaultOpen: true, titleColor: "text-amber-700", bgColor: "bg-amber-50" });
  if (pickup.length > 0)
    groups.push({ key: "pickup", label: "待取件", items: pickup, defaultOpen: true, titleColor: "text-teal-700", bgColor: "bg-teal-50" });
  if (ended.length > 0)
    groups.push({ key: "ended", label: "已结束", items: ended, defaultOpen: false, titleColor: "text-neutral-500", bgColor: "bg-neutral-50" });
  return groups;
}

export function OrderGroupedList({ items }: { items: OrderListItem[] }) {
  const router = useRouter();
  const groups = groupOrders(items);
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
            <option value="diagnosing">检测中</option>
            <option value="quoted">已报价</option>
            <option value="waiting_approval">等回复</option>
            <option value="parts_ordered">等配件</option>
            <option value="parts_arrived">到货</option>
            <option value="repaired">修好</option>
            <option value="notified">已通知</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
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
          <div className="space-y-2 border-t border-border bg-surface-2 p-3 lg:hidden">
            {group.items.map((it) => (
              <article
                key={it.id}
                className={`rounded-xl border border-border bg-surface p-3 ${selected.has(it.id) ? "ring-2 ring-indigo-300/60" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <input
                    checked={selected.has(it.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300"
                    onChange={() => onToggleSelect(it.id)}
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <StatusPopover orderId={it.id} status={it.status} />
                      <div className="shrink-0 text-sm font-semibold text-neutral-900">{it.customerPhone || "-"}</div>
                    </div>
                    <div className="truncate text-base font-semibold text-neutral-900">
                      {it.deviceLabel || "-"}
                    </div>
                    <div className="text-xs text-neutral-500">{it.customerName ?? "-"}</div>
                    <div className="break-words text-xs leading-snug text-neutral-400 line-clamp-2">{it.issue || "-"}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
                      <div>电话：{it.customerPhone || "-"}</div>
                      <div>技师：{it.technicianName ?? "-"}</div>
                      <div>创建：{fmtDate(it.createdAt)}</div>
                      <div className="text-neutral-700">
                        <button
                          className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-muted/70 active:bg-muted disabled:cursor-not-allowed disabled:opacity-60`}
                          disabled={isTerminalOrderStatus(it.status)}
                          title={
                            isTerminalOrderStatus(it.status)
                              ? "已完成或已取消的工单不可修改"
                              : "点击选择供应商"
                          }
                          type="button"
                          onClick={(e) => {
                            if (!isTerminalOrderStatus(it.status)) onOpenSupplierPicker(it, e.currentTarget);
                          }}
                        >
                          <span className="shrink-0">供应商：</span>
                          {it.supplierShortName ? (
                            <SupplierBadge color={it.supplierColor} name={it.supplierShortName} size="sm" />
                          ) : (
                            <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-400">选择</span>
                          )}
                        </button>
                      </div>
                    </div>
                    <OrderListMoneyCell
                      money={{
                        quotationAmount: it.quotationAmount,
                        depositAmount: it.depositAmount,
                        balanceAmount: it.balanceAmount,
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-neutral-500">创建：{fmtDate(it.createdAt)}</span>
                      <Link
                        className="inline-flex h-9 items-center rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-neutral-700 hover:bg-muted"
                        href={`/orders/${it.id}`}
                      >
                        详情
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <div className="min-w-[1000px]">
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
                  <div className="pt-1 text-xs font-medium leading-snug text-neutral-900">{it.customerPhone || "-"}</div>
                  <div className="min-w-0 space-y-0.5 pr-2 pt-1">
                    <div className="truncate text-base font-semibold text-neutral-900">
                      {it.deviceLabel || "-"}
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
                      className="inline-flex max-w-full min-h-[28px] items-center gap-1 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-muted/70 active:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isTerminalOrderStatus(it.status)}
                      title={
                        isTerminalOrderStatus(it.status)
                          ? "已完成或已取消的工单不可修改"
                          : "点击选择供应商"
                      }
                      type="button"
                      onClick={(e) => {
                        if (!isTerminalOrderStatus(it.status)) onOpenSupplierPicker(it, e.currentTarget);
                      }}
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
          </div>
        </>
      )}
    </div>
  );
});

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}
