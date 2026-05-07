import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function writeOrderEvent(input: {
  storeId: string;
  orderId: string;
  eventType: string;
  payload: Record<string, unknown>;
  operatorName?: string;
}) {
  try {
    const supabase = createSupabaseServerClient();
    const result = await supabase.from("order_events").insert({
      store_id: input.storeId,
      order_id: input.orderId,
      event_type: input.eventType,
      payload: input.payload,
      operator_name: input.operatorName ?? "system",
    });

    if (result.error) {
      console.error(`[writeOrderEvent] failed for order ${input.orderId}:`, result.error.message);
    }
  } catch (e) {
    console.error(`[writeOrderEvent] unexpected error for order ${input.orderId}:`, e);
  }
}
