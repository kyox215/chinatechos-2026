export type TransitionResult = {
  ok: boolean;
  reason?: string;
};

const STATUS_ORDER = [
  "new",
  "diagnosing",
  "quoted",
  "waiting_approval",
  "parts_ordered",
  "parts_arrived",
  "repaired",
  "notified",
  "completed",
] as const;

const TERMINAL = new Set(["completed", "cancelled"]);

const ALL_STATUSES = [...STATUS_ORDER, "cancelled"] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "接单",
  diagnosing: "检测中",
  quoted: "已报价",
  waiting_approval: "等回复",
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
  if (TERMINAL.has(fromStatus)) {
    return { ok: false, reason: `终态 "${STATUS_LABELS[fromStatus] ?? fromStatus}" 不可再转出` };
  }

  if (fromStatus === toStatus) {
    return { ok: false, reason: "不能转到相同状态" };
  }

  const validTargets = ALL_STATUSES.filter((s) => s !== fromStatus);
  if (!validTargets.includes(toStatus as (typeof ALL_STATUSES)[number])) {
    return { ok: false, reason: `不支持转到 "${toStatus}"` };
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

  const currentIdx = STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number]);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1
    ? STATUS_ORDER[currentIdx + 1]
    : null;

  const primary: ActionItem[] = [];
  const secondary: ActionItem[] = [];

  if (nextStatus) {
    primary.push({
      toStatus: nextStatus,
      label: STATUS_LABELS[nextStatus] ?? nextStatus,
      confirmText: `确认切换到 "${STATUS_LABELS[nextStatus]}"？`,
    });
  }

  for (const s of STATUS_ORDER) {
    if (s === status || s === nextStatus) continue;
    secondary.push({
      toStatus: s,
      label: STATUS_LABELS[s] ?? s,
      confirmText: `确认切换到 "${STATUS_LABELS[s]}"？`,
    });
  }

  secondary.push({
    toStatus: "cancelled",
    label: "已取消",
    confirmText: "确认取消此工单？",
    variant: "danger",
  });

  return { primary, secondary };
}
