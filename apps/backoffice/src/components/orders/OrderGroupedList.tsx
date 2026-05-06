"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderTransitionButton } from "@/components/OrderTransitionButton";
import { getNextActions } from "@/lib/domain/order-status";

type OrderItem = {
  id: string;
  publicNo: string;
  status: string;
  orderType: string;
  customerName: string | null;
  customerPhone: string;
  deviceLabel: string;
  issue: string;
  total: number | null;
  isPaid: boolean;
  createdAt: string;
  technicianName: string | null;
};

type StatusGroup = {
  key: string;
  label: string;
  items: OrderItem[];
  defaultOpen: boolean;
};

const PENDING_STATUSES = new Set(["new", "parts_ordered", "parts_arrived"]);
const REPAIRING_STATUSES = new Set(["diagnosing", "waiting_approval", "repairing"]);
const PICKUP_STATUSES = new Set(["repaired", "notified", "waiting_pickup"]);

function groupOrders(items: OrderItem[]): StatusGroup[] {
  const pending: OrderItem[] = [];
  const repairing: OrderItem[] = [];
  const pickup: OrderItem[] = [];
  const ended: OrderItem[] = [];

  for (const item of items) {
    if (PENDING_STATUSES.has(item.status)) pending.push(item);
    else if (REPAIRING_STATUSES.has(item.status)) repairing.push(item);
    else if (PICKUP_STATUSES.has(item.status)) pickup.push(item);
    else ended.push(item);
  }

  const groups: StatusGroup[] = [];
  if (pending.length > 0) groups.push({ key: "pending", label: "待处理", items: pending, defaultOpen: true });
  if (repairing.length > 0) groups.push({ key: "repairing", label: "维修中", items: repairing, defaultOpen: true });
  if (pickup.length > 0) groups.push({ key: "pickup", label: "待取件", items: pickup, defaultOpen: true });
  if (ended.length > 0) groups.push({ key: "ended", label: "已结束", items: ended, defaultOpen: false });
  return groups;
}

export function OrderGroupedList({ items }: { items: OrderItem[] }) {
  const router = useRouter();
  const groups = groupOrders(items);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState("");
  const [batchPending, setBatchPending] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(groupItems: OrderItem[]) {
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
        暂无工单数据。
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
          onToggleSelect={toggleSelect}
          onToggleGroup={() => toggleGroup(group.items)}
        />
      ))}

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg">
          <span className="text-sm font-medium text-neutral-900">已选 {selected.size} 个</span>
          <select
            className="ui-input h-8 text-xs"
            onChange={(e) => setBatchStatus(e.target.value)}
            value={batchStatus}
          >
            <option value="">选择目标状态</option>
            <option value="diagnosing">检测中</option>
            <option value="waiting_approval">待客户确认报价</option>
            <option value="repairing">维修中</option>
            <option value="waiting_pickup">待取件</option>
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
    </div>
  );
}

function GroupSection({
  group,
  selected,
  onToggleSelect,
  onToggleGroup,
}: {
  group: StatusGroup;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleGroup: () => void;
}) {
  const [open, setOpen] = useState(group.defaultOpen);
  const allSelected = group.items.length > 0 && group.items.every((i) => selected.has(i.id));

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center bg-surface-2 px-3 py-2">
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
            <span className="text-sm font-semibold text-neutral-900">{group.label}</span>
            <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-neutral-600">
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
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[32px_90px_150px_1fr_90px_80px_80px_160px] gap-0 border-t border-border bg-surface px-3 py-1.5 text-xs font-semibold text-neutral-500">
              <div />
              <div>状态</div>
              <div>工单号</div>
              <div>客户 / 设备</div>
              <div>时间</div>
              <div>金额</div>
              <div>技师</div>
              <div className="text-right">操作</div>
            </div>

            {group.items.map((it) => (
              <div
                key={it.id}
                className={`grid grid-cols-[32px_90px_150px_1fr_90px_80px_80px_160px] items-center gap-0 border-t border-border px-3 py-2 ${selected.has(it.id) ? "bg-indigo-50/50" : ""}`}
              >
                <div>
                  <input
                    checked={selected.has(it.id)}
                    className="h-4 w-4 rounded border-neutral-300"
                    onChange={() => onToggleSelect(it.id)}
                    type="checkbox"
                  />
                </div>
                <div><OrderStatusBadge status={it.status} /></div>
                <div className="text-xs font-medium text-neutral-900">{it.publicNo}</div>
                <div className="min-w-0 pr-2">
                  <div className="truncate text-sm font-medium text-neutral-900">
                    {it.customerName ?? "未命名客户"}
                    {it.deviceLabel ? <span className="font-normal text-neutral-500"> · {it.deviceLabel}</span> : null}
                  </div>
                  <div className="truncate text-xs text-neutral-400">{it.issue || "-"}</div>
                </div>
                <div className="text-xs text-neutral-500">{fmtDate(it.createdAt)}</div>
                <div className="text-xs font-semibold text-neutral-900">{fmtEUR(it.total)}</div>
                <div className="truncate text-xs text-neutral-500">{it.technicianName ?? "-"}</div>
                <div className="flex justify-end gap-1">
                  <Link
                    className="h-7 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-neutral-600 leading-7 hover:bg-muted"
                    href={`/orders/${it.id}`}
                  >
                    详情
                  </Link>
                  <PrimaryAction it={it} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryAction({ it }: { it: OrderItem }) {
  const actions = getNextActions(it.status, it.orderType);
  const primary = actions.find((a) => a.toStatus !== "cancelled");
  if (!primary) return null;

  return (
    <OrderTransitionButton
      confirmText={primary.confirmText}
      label={primary.label}
      orderId={it.id}
      toStatus={primary.toStatus}
      variant={primary.variant}
    />
  );
}

function fmtEUR(v: number | null) {
  if (v == null) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
}

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}
