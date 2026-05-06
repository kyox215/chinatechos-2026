import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

export type StoreSettings = {
  id: string;
  name: string;
  storeCode: string;
  timezone: string;
  approvalOverdueHours: number;
  pickupOverdueDays: number;
};

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const storeId = await resolveStoreId();
  if (!storeId) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, store_code, timezone, approval_overdue_hours, pickup_overdue_days")
    .eq("id", storeId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    storeCode: data.store_code,
    timezone: data.timezone,
    approvalOverdueHours: data.approval_overdue_hours,
    pickupOverdueDays: data.pickup_overdue_days,
  };
}
