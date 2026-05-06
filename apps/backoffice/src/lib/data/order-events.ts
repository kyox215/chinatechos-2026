import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function writeOrderEvent(input: {
  storeId: string;
  orderId: string;
  eventType: string;
  payload: Record<string, unknown>;
  operatorName?: string;
}) {
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("order_events").insert({
    store_id: input.storeId,
    order_id: input.orderId,
    event_type: input.eventType,
    payload: input.payload,
    operator_name: input.operatorName ?? "system",
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}
