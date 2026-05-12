import type { RepairOrderStatus } from "@/lib/order-status";

/** 与 ORDERS_FULL_EXPORT.md §8.3 `statusGroups` 对齐（用于列表分段 Tab + `.in(status, …)`） */
export type OrderStatusTab =
  | "all"
  | "in_progress"
  | "awaiting_approval"
  | "awaiting_pickup"
  | "completed"
  | "cancelled";

const TAB_KEYS = new Set<OrderStatusTab>([
  "all",
  "in_progress",
  "awaiting_approval",
  "awaiting_pickup",
  "completed",
  "cancelled",
]);

export const ORDER_LIST_IN_PROGRESS_STATUSES: RepairOrderStatus[] = [
  "new",
  "rework",
  "mail_in_progress",
  "diagnosing",
  "quoted",
  "parts_ordered",
  "parts_arrived",
  "repairing",
];

const TAB_TO_STATUSES: Record<Exclude<OrderStatusTab, "all">, RepairOrderStatus[]> = {
  in_progress: [...ORDER_LIST_IN_PROGRESS_STATUSES],
  awaiting_approval: ["waiting_approval"],
  awaiting_pickup: ["repaired", "notified", "waiting_pickup", "unfixed_pickup"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export function parseOrderStatusTab(raw: string | undefined): OrderStatusTab {
  if (raw && TAB_KEYS.has(raw as OrderStatusTab)) return raw as OrderStatusTab;
  return "all";
}

export function statusesForOrderStatusTab(tab: OrderStatusTab): RepairOrderStatus[] | null {
  if (tab === "all") return null;
  return TAB_TO_STATUSES[tab];
}

export const ORDER_LIST_TAB_LABELS: Record<OrderStatusTab, string> = {
  all: "全部",
  in_progress: "进行中",
  awaiting_approval: "待审批",
  awaiting_pickup: "待取机",
  completed: "已完成",
  cancelled: "已取消",
};

/** 用于 OrderStatusBadge 的 progress/warn 脉动点（对齐导出文档 live 态） */
export function orderStatusHasLivePulse(status: string): boolean {
  const s = status as RepairOrderStatus;
  const progress: RepairOrderStatus[] = [
    "diagnosing",
    "quoted",
    "waiting_approval",
    "parts_ordered",
    "parts_arrived",
    "repairing",
  ];
  const warn: RepairOrderStatus[] = ["rework", "waiting_pickup", "unfixed_pickup"];
  return progress.includes(s) || warn.includes(s);
}
