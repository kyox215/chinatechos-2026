export type TransitionResult = {
  ok: boolean;
  reason?: string;
};

export type TransitionContext = {
  orderType: string;
  quotationAmount?: number | null;
  deliveredAt?: string | null;
  isPaid?: boolean;
};

const QUICK_REPAIR_TRANSITIONS: Record<string, string[]> = {
  new: ["repairing", "cancelled"],
  repairing: ["waiting_pickup", "cancelled"],
  waiting_pickup: ["completed", "cancelled"],
};

const DROPOFF_REPAIR_TRANSITIONS: Record<string, string[]> = {
  new: ["diagnosing", "cancelled"],
  diagnosing: ["waiting_approval", "cancelled"],
  waiting_approval: ["repairing", "cancelled"],
  repairing: ["waiting_pickup", "cancelled"],
  waiting_pickup: ["completed", "cancelled"],
};

export function validateOrderTransition(
  fromStatus: string,
  toStatus: string,
  context?: TransitionContext,
): TransitionResult {
  const orderType = context?.orderType ?? "dropoff_repair";
  const transitions =
    orderType === "quick_repair" ? QUICK_REPAIR_TRANSITIONS : DROPOFF_REPAIR_TRANSITIONS;

  const allowed = transitions[fromStatus];
  if (!allowed) {
    return { ok: false, reason: `不支持从 ${fromStatus} 发起流转` };
  }
  if (!allowed.includes(toStatus)) {
    return { ok: false, reason: `不允许从 ${fromStatus} 流转到 ${toStatus}` };
  }

  // Pre-condition checks
  if (toStatus === "waiting_approval" && !context?.quotationAmount) {
    return { ok: false, reason: "进入待客户确认报价状态前，必须填写报价金额" };
  }

  if (toStatus === "completed" && !context?.deliveredAt) {
    return { ok: false, reason: "完成工单前，必须确认已交付客户" };
  }

  return { ok: true };
}

export function getNextActions(
  status: string,
  orderType: string,
): { toStatus: string; label: string; confirmText: string; variant?: "danger" }[] {
  const actions: { toStatus: string; label: string; confirmText: string; variant?: "danger" }[] = [];

  if (orderType === "quick_repair") {
    switch (status) {
      case "new":
        actions.push({ toStatus: "repairing", label: "开始维修", confirmText: "确认开始维修？" });
        break;
      case "repairing":
        actions.push({ toStatus: "waiting_pickup", label: "标记完工", confirmText: "确认标记为待取件？" });
        break;
      case "waiting_pickup":
        actions.push({ toStatus: "completed", label: "完成工单", confirmText: "确认完成工单？" });
        break;
    }
  } else {
    switch (status) {
      case "new":
        actions.push({ toStatus: "diagnosing", label: "开始诊断", confirmText: "确认开始诊断？" });
        break;
      case "diagnosing":
        actions.push({ toStatus: "waiting_approval", label: "发送报价", confirmText: "确认发送报价给客户？" });
        break;
      case "waiting_approval":
        actions.push({ toStatus: "repairing", label: "客户同意", confirmText: "确认客户已同意报价，开始维修？" });
        actions.push({ toStatus: "cancelled", label: "客户拒绝", confirmText: "确认客户拒绝报价？工单将被取消。", variant: "danger" });
        break;
      case "repairing":
        actions.push({ toStatus: "waiting_pickup", label: "标记完工", confirmText: "确认标记为待取件？" });
        break;
      case "waiting_pickup":
        actions.push({ toStatus: "completed", label: "完成工单", confirmText: "确认完成工单？" });
        break;
    }
  }

  if (!["completed", "cancelled"].includes(status) && !actions.some((a) => a.toStatus === "cancelled")) {
    actions.push({ toStatus: "cancelled", label: "取消工单", confirmText: "确认取消此工单？", variant: "danger" });
  }

  return actions;
}
