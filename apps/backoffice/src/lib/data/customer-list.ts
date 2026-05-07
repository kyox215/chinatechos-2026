import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

export type CustomerListItem = {
  id: string;
  name: string | null;
  phoneE164: string;
  phoneRaw: string | null;
  totalOrders: number;
  totalSpend: number;
  lastOrderAt: string | null;
  lastOrderStatus: string | null;
  hasActiveOrder: boolean;
  createdAt: string;
};

export type CustomerListFilters = {
  q?: string;
  hasActiveOrder?: boolean;
  hasRecentOrder?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listCustomers(filters: CustomerListFilters = {}): Promise<{
  items: CustomerListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const storeId = await resolveStoreId();
  if (!env.supabaseUrl || !storeId) {
    return { items: [], totalCount: 0, page: 1, pageSize: 50 };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("customers")
    .select("id, name, phone_e164, phone_raw, created_at", { count: "exact" })
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.q) {
    const escaped = filters.q.replace(/[,%]/g, "");
    const like = `%${escaped}%`;
    query = query.or(`phone_e164.ilike.${like},name.ilike.${like}`);
  }

  const { data: customers, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);
  const totalCount = count ?? 0;
  if (!customers || customers.length === 0) return { items: [], totalCount, page, pageSize };

  const customerIds = customers.map((c) => c.id);

  // Fetch all orders for these customers to compute stats
  const { data: orders } = await supabase
    .from("repair_orders")
    .select("customer_id, status, quotation_amount, created_at")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false });

  // Aggregate per customer
  const statsMap = new Map<
    string,
    {
      totalOrders: number;
      totalSpend: number;
      lastOrderAt: string | null;
      lastOrderStatus: string | null;
      hasActiveOrder: boolean;
    }
  >();

  const activeStatuses = new Set(["new", "diagnosing", "waiting_approval", "repairing", "waiting_pickup"]);

  for (const order of orders ?? []) {
    if (!order.customer_id) continue;
    const existing = statsMap.get(order.customer_id) ?? {
      totalOrders: 0,
      totalSpend: 0,
      lastOrderAt: null,
      lastOrderStatus: null,
      hasActiveOrder: false,
    };
    existing.totalOrders += 1;
    existing.totalSpend += order.quotation_amount ?? 0;
    if (!existing.lastOrderAt) {
      existing.lastOrderAt = order.created_at;
      existing.lastOrderStatus = order.status;
    }
    if (activeStatuses.has(order.status)) {
      existing.hasActiveOrder = true;
    }
    statsMap.set(order.customer_id, existing);
  }

  let items: CustomerListItem[] = customers.map((c) => {
    const stats = statsMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      phoneE164: c.phone_e164,
      phoneRaw: c.phone_raw,
      totalOrders: stats?.totalOrders ?? 0,
      totalSpend: stats?.totalSpend ?? 0,
      lastOrderAt: stats?.lastOrderAt ?? null,
      lastOrderStatus: stats?.lastOrderStatus ?? null,
      hasActiveOrder: stats?.hasActiveOrder ?? false,
      createdAt: c.created_at,
    };
  });

  // Apply post-fetch filters
  if (filters.hasActiveOrder) {
    items = items.filter((c) => c.hasActiveOrder);
  }
  if (filters.hasRecentOrder) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    items = items.filter((c) => c.lastOrderAt && c.lastOrderAt >= thirtyDaysAgo);
  }

  return { items, totalCount, page, pageSize };
}
