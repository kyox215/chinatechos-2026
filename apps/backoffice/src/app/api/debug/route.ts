import { NextResponse } from "next/server";
import { env, getDefaultStoreId } from "@/lib/env/server";

export async function GET() {
  const checks: Record<string, unknown> = {
    supabaseUrl: env.supabaseUrl ? "SET" : "MISSING",
    supabaseAnonKey: env.supabaseAnonKey ? "SET" : "MISSING",
    supabaseServiceRoleKey: env.supabaseServiceRoleKey ? "SET" : "MISSING",
    defaultStoreIdEnv: env.defaultStoreId ?? "NOT_SET",
  };

  try {
    const resolvedId = await getDefaultStoreId();
    checks.resolvedStoreId = resolvedId ?? "RESOLVE_FAILED";
  } catch (e) {
    checks.resolvedStoreId = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (env.supabaseUrl && env.supabaseServiceRoleKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await supabase.from("stores").select("id, name").limit(5);
      checks.storesQuery = error ? `ERROR: ${error.message}` : data;
    } catch (e) {
      checks.storesQuery = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json(checks);
}
