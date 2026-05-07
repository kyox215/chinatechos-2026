export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  defaultStoreId: process.env.DEFAULT_STORE_ID,
  /** Recovery hold window in days; optional override for `resolveTradeInHoldDaysForStore`. */
  tradeInHoldDays: process.env.TRADE_IN_HOLD_DAYS,
};

let _resolvedStoreId: string | null = null;

export async function getDefaultStoreId(): Promise<string | null> {
  if (env.defaultStoreId) return env.defaultStoreId;
  if (_resolvedStoreId) return _resolvedStoreId;

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data } = await supabase
    .from("stores")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (data?.id) {
    _resolvedStoreId = data.id;
  }
  return _resolvedStoreId;
}
