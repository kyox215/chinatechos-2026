import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

/** Ensures supplier UUID belongs to the given store (same rule as PATCH /api/orders/[id]). */
export async function assertSupplierBelongsToStore(
  supabase: SupabaseServerClient,
  storeId: string,
  supplierId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (res.error || !res.data) {
    return { ok: false, error: "供应商无效或不属于当前门店" };
  }
  return { ok: true };
}
