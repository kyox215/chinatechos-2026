export type TransitionResult = {
  ok: boolean;
  reason?: string;
};

const STATUS_ORDER = [
  "new",
  "diagnosing",
  "quoted",
  "waiting_approval",
  "repairing",
  "parts_ordered",
  "parts_arrived",
  "repaired",
  "notified",
  "completed",
] as const;

/** Terminal statuses: order cannot transition away from these (exported for UI parity). */
export const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

const TERMINAL = TERMINAL_STATUSES;

const ALL_STATUSES = [...STATUS_ORDER, "cancelled"] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "接单",
  diagnosing: "检测中",
  quoted: "已报价",
  waiting_approval: "等回复",
  repairing: "维修中",
  parts_ordered: "等配件",
  parts_arrived: "到货",
  repaired: "修好",
  notified: "已通知",
  completed: "已完成",
  cancelled: "已取消",
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new:               ["diagnosing", "quoted", "cancelled"],
  diagnosing:        ["quoted", "waiting_approval", "repairing", "cancelled"],
  quoted:            ["waiting_approval", "repairing", "cancelled"],
  waiting_approval:  ["repairing", "cancelled"],
  repairing:         ["parts_ordered", "repaired", "cancelled"],
  parts_ordered:     ["parts_arrived", "cancelled"],
  parts_arrived:     ["repairing", "repaired", "cancelled"],
  repaired:          ["notified", "completed", "cancelled"],
  notified:          ["completed", "cancelled"],
};

export function validateOrderTransition(
  fromStatus: string,
  toStatus: string,
): TransitionResult {
  if (TERMINAL.has(fromStatus)) {
    return { ok: false, reason: `终态 "${STATUS_LABELS[fromStatus] ?? fromStatus}" 不可再转出` };
  }

  if (fromStatus === toStatus) {
    return { ok: false, reason: "不能转到相同状态" };
  }

  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    const fromLabel = STATUS_LABELS[fromStatus] ?? fromStatus;
    const toLabel = STATUS_LABELS[toStatus] ?? toStatus;
    return { ok: false, reason: `"${fromLabel}" 不可直接转到 "${toLabel}"` };
  }

  return { ok: true };
}

export type ActionItem = {
  toStatus: string;
  label: string;
  confirmText: string;
  variant?: "danger";
};

export function getNextActions(status: string): {
  primary: ActionItem[];
  secondary: ActionItem[];
} {
  if (TERMINAL.has(status)) {
    return { primary: [], secondary: [] };
  }

  const allowed = ALLOWED_TRANSITIONS[status] ?? [];
  const nonCancel = allowed.filter((s) => s !== "cancelled");

  const primary: ActionItem[] = [];
  const secondary: ActionItem[] = [];

  if (nonCancel.length > 0) {
    primary.push({
      toStatus: nonCancel[0],
      label: STATUS_LABELS[nonCancel[0]] ?? nonCancel[0],
      confirmText: `确认切换到 "${STATUS_LABELS[nonCancel[0]]}"？`,
    });

    for (let i = 1; i < nonCancel.length; i++) {
      secondary.push({
        toStatus: nonCancel[i],
        label: STATUS_LABELS[nonCancel[i]] ?? nonCancel[i],
        confirmText: `确认切换到 "${STATUS_LABELS[nonCancel[i]]}"？`,
      });
    }
  }

  if (allowed.includes("cancelled")) {
    secondary.push({
      toStatus: "cancelled",
      label: "已取消",
      confirmText: "确认取消此工单？",
      variant: "danger",
    });
  }

  return { primary, secondary };
}
