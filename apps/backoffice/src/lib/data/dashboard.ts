import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { getStoreSettings } from "@/lib/data/store-settings";

export type DashboardMetrics = {
  approvalOverdue: number;
  pickupOverdue: number;
  todayCreated: number;
  todayCompleted: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) {
    return { approvalOverdue: 0, pickupOverdue: 0, todayCreated: 0, todayCompleted: 0 };
  }

  const supabase = createSupabaseServerClient();
  const settings = await getStoreSettings();
  const approvalHours = settings?.approvalOverdueHours ?? 48;
  const pickupDays = settings?.pickupOverdueDays ?? 5;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const approvalOverdue = await countOrdersByFilter(supabase, {
    storeId,
    status: "waiting_approval",
    olderThanHoursField: { field: "approval_sent_at", hours: approvalHours },
  });

  const pickupOverdue = await countOrdersByFilter(supabase, {
    storeId,
    status: "waiting_pickup",
    olderThanHoursField: { field: "completed_at", hours: 24 * pickupDays },
  });

  const todayCreated = await countOrdersByFilter(supabase, {
    storeId,
    createdAfter: startOfDay.toISOString(),
  });

  const todayCompleted = await countOrdersByFilter(supabase, {
    storeId,
    status: "completed",
    createdAfter: startOfDay.toISOString(),
  });

  return { approvalOverdue, pickupOverdue, todayCreated, todayCompleted };
}

async function countOrdersByFilter(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  input: {
    storeId: string;
    status?: string;
    createdAfter?: string;
    olderThanHoursField?: { field: "approval_sent_at" | "completed_at"; hours: number };
  },
) {
  let q = supabase
    .from("repair_orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", input.storeId)
    .is("deleted_at", null);

  if (input.status) {
    q = q.eq("status", input.status);
  }

  if (input.createdAfter) {
    q = q.gte("created_at", input.createdAfter);
  }

  if (input.olderThanHoursField) {
    const cutoff = new Date(Date.now() - input.olderThanHoursField.hours * 3600 * 1000).toISOString();
    q = q.lte(input.olderThanHoursField.field, cutoff);
  }

  const res = await q;
  if (res.error) {
    throw new Error(res.error.message);
  }

  return res.count ?? 0;
}
