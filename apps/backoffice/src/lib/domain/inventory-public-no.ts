import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

/**
 * Inventory public number: {storeCode}-I{YYMMDD}-{seq}
 * Example: MI-I260507-001
 */
export async function generateInventoryPublicNo(storeCode: string): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${storeCode}-I${yy}${mm}${dd}`;

  const storeId = await resolveStoreId();
  if (!storeId) throw new Error("无法确定门店");
  const supabase = createSupabaseServerClient();

  const { count } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .like("public_no", `${datePrefix}-%`);

  const seq = (count ?? 0) + 1;
  const seqStr = String(seq).padStart(3, "0");

  return `${datePrefix}-${seqStr}`;
}
