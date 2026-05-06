export type TransitionResult = {
  ok: boolean;
  reason?: string;
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  waiting_approval: ["repairing", "cancelled"],
  repairing: ["waiting_pickup"],
};

export function validateOrderTransition(fromStatus: string, toStatus: string): TransitionResult {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) {
    return { ok: false, reason: `不支持从 ${fromStatus} 发起流转` };
  }
  if (!allowed.includes(toStatus)) {
    return { ok: false, reason: `不允许从 ${fromStatus} 流转到 ${toStatus}` };
  }
  return { ok: true };
}
