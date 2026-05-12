export type TransitionResult = {
  ok: boolean;
  reason?: string;
};

/** Workflow sequence for list ordering (primary sort), then by `updated_at` desc. */
const STATUS_ORDER = [
  "rework",
  "new",
  "mail_in_progress",
  "diagnosing",
  "quoted",
  "waiting_approval",
  "repairing",
  "parts_ordered",
  "parts_arrived",
  "repaired",
  "notified",
  "unfixed_pickup",
  "completed",
] as const;

const LIST_STATUS_SEQUENCE = [...STATUS_ORDER, "waiting_pickup", "cancelled"] as const;

export function getStatusListSortIndex(status: string): number {
  const idx = (LIST_STATUS_SEQUENCE as readonly string[]).indexOf(status);
  return idx === -1 ? LIST_STATUS_SEQUENCE.length + 100 : idx;
}

/** Previously-terminal statuses — exported for UI styling only, no longer blocks transitions. */
export const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

const ALL_STATUSES = [...STATUS_ORDER, "waiting_pickup", "cancelled"] as const;

const ALL_STATUSES_SET = new Set<string>(ALL_STATUSES as readonly string[]);

/** 与徽标话术对齐；导出、下拉、批量切换同源使用 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  rework: "返修",
  new: "接单",
  mail_in_progress: "寄修中",
  diagnosing: "检测中",
  quoted: "报价",
  waiting_approval: "报价待确认",
  repairing: "报价已确认",
  parts_ordered: "等配件",
  parts_arrived: "到货已通知",
  repaired: "修好未通知",
  notified: "修好已通知",
  unfixed_pickup: "未修待取件",
  waiting_pickup: "待取件（旧）",
  completed: "已完成",
  cancelled: "已取消",
};

export const ORDER_STATUS_SELECT_SEQUENCE = [
  "rework",
  "new",
  "mail_in_progress",
  "diagnosing",
  "quoted",
  "waiting_approval",
  "repairing",
  "parts_ordered",
  "parts_arrived",
  "repaired",
  "notified",
  "unfixed_pickup",
  "waiting_pickup",
  "completed",
  "cancelled",
] as const;

/** Subset of enum for `initialStatus` on create — same as full select list; invalid input falls back to `new`. */
export const ORDER_STATUS_ALLOWED_FOR_CREATE = new Set<string>(
  ORDER_STATUS_SELECT_SEQUENCE as readonly string[],
);

export function normalizeInitialOrderStatus(raw: string | undefined): string {
  if (raw && ORDER_STATUS_ALLOWED_FOR_CREATE.has(raw)) return raw;
  return "new";
}

export function getOrderStatusSelectOptions(): { value: string; label: string }[] {
  return ORDER_STATUS_SELECT_SEQUENCE.map((value) => ({
    value,
    label: ORDER_STATUS_LABELS[value] ?? value,
  }));
}

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function validateOrderTransition(fromStatus: string, toStatus: string): TransitionResult {
  if (fromStatus === toStatus) {
    return { ok: false, reason: "不能转到相同状态" };
  }
  return { ok: true };
}

export type ActionItem = {
  toStatus: string;
  label: string;
  confirmText: string;
  variant?: "danger";
};

export function getNextActions(
  status: string,
  labels: Record<string, string> = ORDER_STATUS_LABELS,
  statusOrder: readonly string[] = ORDER_STATUS_SELECT_SEQUENCE as readonly string[],
): {
  primary: ActionItem[];
  secondary: ActionItem[];
} {
  const lbl = (s: string) => labels[s] ?? ORDER_STATUS_LABELS[s] ?? s;

  const ordered = statusOrder.filter((s) => ALL_STATUSES_SET.has(s));
  const nonCancelTargets = ordered.filter((s) => s !== status && s !== "cancelled");

  let primaryStatus: string | undefined;
  const idx = ordered.indexOf(status);
  if (idx !== -1) {
    for (let i = idx + 1; i < ordered.length; i++) {
      const s = ordered[i];
      if (s !== status && ALL_STATUSES_SET.has(s)) {
        primaryStatus = s;
        break;
      }
    }
  }
  if (primaryStatus === undefined && nonCancelTargets.length > 0) {
    primaryStatus = nonCancelTargets[0];
  }

  const primary: ActionItem[] = [];
  const secondary: ActionItem[] = [];

  if (primaryStatus !== undefined) {
    primary.push({
      toStatus: primaryStatus,
      label: lbl(primaryStatus),
      confirmText: `确认切换到 "${lbl(primaryStatus)}"？`,
      ...(primaryStatus === "cancelled" ? { variant: "danger" as const } : {}),
    });
  }

  const secondaryStatuses: string[] = [];
  for (const s of ordered) {
    if (s === status) continue;
    if (s === primaryStatus) continue;
    if (!ALL_STATUSES_SET.has(s)) continue;
    if (s === "cancelled") continue;
    secondaryStatuses.push(s);
  }

  for (const s of secondaryStatuses) {
    secondary.push({
      toStatus: s,
      label: lbl(s),
      confirmText: `确认切换到 "${lbl(s)}"？`,
    });
  }

  if (status !== "cancelled" && primaryStatus !== "cancelled") {
    secondary.push({
      toStatus: "cancelled",
      label: lbl("cancelled"),
      confirmText: "确认取消此工单？",
      variant: "danger",
    });
  }

  return { primary, secondary };
}
