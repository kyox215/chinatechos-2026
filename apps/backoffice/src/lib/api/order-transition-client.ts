export type OrderTransitionPayload = {
  toStatus: string;
  operatorName?: string;
  cancelReason?: string;
  supplierId?: string;
};

/**
 * POST `/api/orders/[id]/transition`. Throws with API `error` message when request fails.
 */
export async function postOrderTransition(
  orderId: string,
  payload: OrderTransitionPayload & Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}/transition`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      operatorName: "frontdesk",
      ...payload,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `状态流转失败 (${res.status})`);
  }
}

export type BatchTransitionResponse = {
  ok?: boolean;
  error?: string;
  total?: number;
  successCount?: number;
  results?: { id: string; ok: boolean; error?: string }[];
};

export async function postOrdersBatchTransition(body: {
  orderIds: string[];
  toStatus: string;
  operatorName?: string;
  supplierId?: string;
  cancelReason?: string;
}): Promise<BatchTransitionResponse> {
  const res = await fetch("/api/orders/batch-transition", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as BatchTransitionResponse;
  if (!res.ok) {
    throw new Error(data.error ?? `批量流转失败 (${res.status})`);
  }
  return data;
}
