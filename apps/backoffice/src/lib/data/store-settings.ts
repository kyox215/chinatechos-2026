import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveOrderUiFromRaw, type ResolvedOrderUi } from "@/lib/domain/order-ui-config";
import { resolveStoreId } from "@/lib/env/resolve-store";

export type StoreSettings = {
  id: string;
  name: string;
  storeCode: string;
  timezone: string;
  approvalOverdueHours: number;
  pickupOverdueDays: number;
  printPaper: "A5" | "A4";
  printOrientation: "landscape" | "portrait";
  printDensity: "compact" | "normal" | "relaxed";
  printMarginMm: 3 | 5 | 8;
  /** DB 原始 JSON，nullable */
  orderUiConfigRaw: unknown | null;
  /** 合并默认后的运行时配置 */
  resolvedOrderUi: ResolvedOrderUi;
};

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const storeId = await resolveStoreId();
  if (!storeId) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, store_code, timezone, approval_overdue_hours, pickup_overdue_days, print_paper, print_orientation, print_density, print_margin_mm, order_ui_config",
    )
    .eq("id", storeId)
    .single();

  if (error || !data) return null;

  const row = data as typeof data & { order_ui_config?: unknown };
  const rawConfig = row.order_ui_config ?? null;

  const resolvedOrderUi = resolveOrderUiFromRaw(rawConfig);

  return {
    id: data.id,
    name: data.name,
    storeCode: data.store_code,
    timezone: data.timezone,
    approvalOverdueHours: data.approval_overdue_hours,
    pickupOverdueDays: data.pickup_overdue_days,
    printPaper: (data.print_paper ?? "A5") as "A5" | "A4",
    printOrientation: (data.print_orientation ?? "landscape") as "landscape" | "portrait",
    printDensity: (data.print_density ?? "normal") as "compact" | "normal" | "relaxed",
    printMarginMm: (data.print_margin_mm ?? 5) as 3 | 5 | 8,
    orderUiConfigRaw: rawConfig ?? null,
    resolvedOrderUi,
  };
}
