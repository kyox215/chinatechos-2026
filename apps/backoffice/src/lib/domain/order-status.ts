export type TransitionResult = {
  ok: boolean;
  reason?: string;
};

const STATUS_ORDER = [
  "rework",
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

/** Workflow sequence for list ordering (primary sort), then by `updated_at` desc. */
const LIST_STATUS_SEQUENCE = [...STATUS_ORDER, "cancelled"] as const;

export function getStatusListSortIndex(status: string): number {
  const idx = (LIST_STATUS_SEQUENCE as readonly string[]).indexOf(status);
  return idx === -1 ? LIST_STATUS_SEQUENCE.length + 100 : idx;
}

/** Previously-terminal statuses — exported for UI styling only, no longer blocks transitions. */
export const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

const ALL_STATUSES = [...STATUS_ORDER, "cancelled"] as const;

const STATUS_LABELS: Record<string, string> = {
  rework: "返修",
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

export function validateOrderTransition(
  fromStatus: string,
  toStatus: string,
): TransitionResult {
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

export function getNextActions(status: string): {
  primary: ActionItem[];
  secondary: ActionItem[];
} {
  const allOther = ALL_STATUSES.filter((s) => s !== status);
  const nonCancel = allOther.filter((s) => s !== "cancelled");

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

  secondary.push({
    toStatus: "cancelled",
    label: "已取消",
    confirmText: "确认取消此工单？",
    variant: "danger",
  });

  return { primary, secondary };
}
