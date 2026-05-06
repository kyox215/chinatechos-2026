"use client";

import Link from "next/link";
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

const ACTIVE_STATUSES = new Set(["new", "diagnosing", "waiting_approval", "repairing", "waiting_pickup"]);

function groupOrders(items: OrderItem[]): StatusGroup[] {
  const active: OrderItem[] = [];
  const completed: OrderItem[] = [];
  const cancelled: OrderItem[] = [];

  for (const item of items) {
    if (item.status === "completed") {
      completed.push(item);
    } else if (item.status === "cancelled") {
      cancelled.push(item);
    } else if (ACTIVE_STATUSES.has(item.status)) {
      active.push(item);
    } else {
      active.push(item);
    }
  }

  const groups: StatusGroup[] = [];
  if (active.length > 0) {
    groups.push({ key: "active", label: "进行中", items: active, defaultOpen: true });
  }
  if (completed.length > 0) {
    groups.push({ key: "completed", label: "已完成", items: completed, defaultOpen: false });
  }
  if (cancelled.length > 0) {
    groups.push({ key: "cancelled", label: "已取消", items: cancelled, defaultOpen: false });
  }
  return groups;
}

export function OrderGroupedList({ items }: { items: OrderItem[] }) {
  const groups = groupOrders(items);

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
        <GroupSection key={group.key} group={group} />
      ))}
    </div>
  );
}

function GroupSection({ group }: { group: StatusGroup }) {
  const [open, setOpen] = useState(group.defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        className="flex w-full items-center justify-between bg-surface-2 px-4 py-2.5 text-left transition-colors hover:bg-muted"
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
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div>
          {/* Table header */}
          <div className="grid grid-cols-[100px_160px_1fr_110px_100px_100px_180px] gap-0 border-t border-border bg-surface px-3 py-1.5 text-xs font-semibold text-neutral-500">
            <div>状态</div>
            <div>工单号</div>
            <div>客户 / 设备</div>
            <div>创建时间</div>
            <div>金额</div>
            <div>技师</div>
            <div className="text-right">操作</div>
          </div>

          {/* Rows */}
          {group.items.map((it) => (
            <div
              key={it.id}
              className="grid grid-cols-[100px_160px_1fr_110px_100px_100px_180px] items-center gap-0 border-t border-border px-3 py-2"
            >
              <div>
                <OrderStatusBadge status={it.status} />
              </div>
              <div className="text-sm font-medium text-neutral-900">{it.publicNo}</div>
              <div className="min-w-0 pr-2">
                <div className="truncate text-sm font-medium text-neutral-900">
                  {it.customerName ?? "未命名客户"}
                  {it.deviceLabel ? <span className="font-normal text-neutral-600"> · {it.deviceLabel}</span> : null}
                </div>
                <div className="truncate text-xs text-neutral-500">
                  {it.issue || "未填写问题描述"}
                </div>
              </div>
              <div className="text-xs text-neutral-600">{formatDateTime(it.createdAt)}</div>
              <div className="text-sm font-semibold text-neutral-900">{formatEUR(it.total)}</div>
              <div className="truncate text-xs text-neutral-600">{it.technicianName ?? "-"}</div>
              <div className="flex justify-end gap-1.5">
                <Link
                  className="h-7 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-neutral-700 leading-7 hover:bg-muted"
                  href={`/orders/${it.id}`}
                >
                  详情
                </Link>
                <OrderActions it={it} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderActions({ it }: { it: OrderItem }) {
  const actions = getNextActions(it.status, it.orderType);
  if (actions.length === 0) return null;

  return (
    <>
      {actions.slice(0, 2).map((action) => (
        <OrderTransitionButton
          key={action.toStatus}
          confirmText={action.confirmText}
          label={action.label}
          orderId={it.id}
          toStatus={action.toStatus}
          variant={action.variant}
          {...(action.toStatus === "cancelled"
            ? { reasonField: "cancelReason", reasonPrompt: "请输入取消原因" }
            : {})}
        />
      ))}
    </>
  );
}

function formatEUR(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
