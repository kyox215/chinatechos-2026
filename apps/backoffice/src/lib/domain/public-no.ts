import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreId } from "@/lib/env/resolve-store";

/**
 * Generate a public order number in the format: {storeCode}-{YYMMDD}-{seq}
 * Example: IT001-260506-001
 */
export async function generatePublicNo(storeCode: string): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${storeCode}-${yy}${mm}${dd}`;

  const storeId = await resolveStoreId();
  const supabase = createSupabaseServerClient();

  const { count } = await supabase
    .from("repair_orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId!)
    .like("public_no", `${datePrefix}-%`);

  const seq = (count ?? 0) + 1;
  const seqStr = String(seq).padStart(3, "0");

  return `${datePrefix}-${seqStr}`;
}
