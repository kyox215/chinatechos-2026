import { env, getDefaultStoreId } from "@/lib/env/server";

/**
 * Resolve the store ID, checking env first then querying DB.
 * Returns null if unavailable.
 */
export async function resolveStoreId(): Promise<string | null> {
  if (env.defaultStoreId) return env.defaultStoreId;
  return getDefaultStoreId();
}
