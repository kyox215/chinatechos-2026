import { env } from "@/lib/env/server";
import { postgrestQuoted, sanitizePostgrestSearchTerm } from "@/lib/domain/order-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

export type CustomerSuggestion = {
  id: string;
  name: string | null;
  phoneE164: string;
  lastOrderAt: string | null;
};

export async function suggestCustomers(input: {
  q: string;
  limit?: number;
}): Promise<CustomerSuggestion[]> {
  const q = input.q.trim();
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 20);
  const storeId = await resolveStoreId();
  if (!q || !storeId || !env.supabaseUrl) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const qSafe = sanitizePostgrestSearchTerm(q);
  if (qSafe.length === 0) {
    return [];
  }
  const qv = postgrestQuoted(`%${qSafe}%`);

  const customerRes = await supabase
    .from("customers")
    .select("id,name,phone_e164")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .or(`phone_e164.ilike.${qv},name.ilike.${qv}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (customerRes.error) {
    throw new Error(customerRes.error.message);
  }

  const customers = customerRes.data ?? [];
  if (customers.length === 0) return [];

  const ids = customers.map((c) => c.id);
  const orderRes = await supabase
    .from("repair_orders")
    .select("customer_id,created_at")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .in("customer_id", ids)
    .order("created_at", { ascending: false })
    .limit(200);

  if (orderRes.error) {
    throw new Error(orderRes.error.message);
  }

  const latestByCustomer = new Map<string, string>();
  for (const row of orderRes.data ?? []) {
    if (!row.customer_id) continue;
    if (!latestByCustomer.has(row.customer_id)) {
      latestByCustomer.set(row.customer_id, row.created_at);
    }
  }

  return customers.map((it) => ({
    id: it.id,
    name: it.name ?? null,
    phoneE164: it.phone_e164,
    lastOrderAt: latestByCustomer.get(it.id) ?? null,
  }));
}
