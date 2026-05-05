import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env/server";

export function createSupabaseServerClient() {
  if (!env.supabaseUrl) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  }

  const key = env.supabaseServiceRoleKey ?? env.supabaseAnonKey;
  if (!key) {
    throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(env.supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
