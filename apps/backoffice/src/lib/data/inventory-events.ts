import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

export async function appendInventoryEvent(input: {
  inventoryItemId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  operatorName?: string | null;
}) {
  const storeId = await resolveStoreId();
  if (!storeId) throw new Error("无法确定门店");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("inventory_events").insert({
    store_id: storeId,
    inventory_item_id: input.inventoryItemId,
    event_type: input.eventType,
    payload: input.payload ?? {},
    operator_name: input.operatorName ?? null,
  });

  if (error) throw new Error(error.message);
}
