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

export type StoreSettingsLoadFailureReason =
  | "no_store_id"
  | "row_not_found"
  | "schema_mismatch"
  | "supabase_error";

export type StoreSettingsLoadResult =
  | { ok: true; settings: StoreSettings }
  | { ok: false; reason: StoreSettingsLoadFailureReason; detail?: string };

function classifySupabaseError(error: { message?: string; code?: string }): StoreSettingsLoadFailureReason {
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";

  if (code === "PGRST116") {
    return "row_not_found";
  }
  if (
    msg.includes("column") &&
    (msg.includes("does not exist") || msg.includes("not found") || msg.includes("could not find"))
  ) {
    return "schema_mismatch";
  }
  if (msg.includes("schema cache") && msg.includes("stores")) {
    return "schema_mismatch";
  }
  return "supabase_error";
}

function rowToStoreSettings(data: {
  id: string;
  name: string;
  store_code: string;
  timezone: string;
  approval_overdue_hours: number;
  pickup_overdue_days: number;
  print_paper: string | null;
  print_orientation: string | null;
  print_density: string | null;
  print_margin_mm: number | null;
  order_ui_config?: unknown;
}): StoreSettings {
  const rawConfig = data.order_ui_config ?? null;
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

export async function getStoreSettingsLoadResult(): Promise<StoreSettingsLoadResult> {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return {
      ok: false,
      reason: "no_store_id",
      detail:
        "未配置 DEFAULT_STORE_ID，且无法在 stores 表中解析默认门店（请确认 SUPABASE_SERVICE_ROLE_KEY 与 stores 至少一行）。",
    };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, store_code, timezone, approval_overdue_hours, pickup_overdue_days, print_paper, print_orientation, print_density, print_margin_mm, order_ui_config",
    )
    .eq("id", storeId)
    .single();

  if (error) {
    const reason = classifySupabaseError(error);
    return {
      ok: false,
      reason,
      detail: error.message,
    };
  }

  if (!data) {
    return { ok: false, reason: "row_not_found", detail: `未找到 id=${storeId} 的门店行。` };
  }

  const row = data as typeof data & { order_ui_config?: unknown };
  return { ok: true, settings: rowToStoreSettings(row) };
}

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const result = await getStoreSettingsLoadResult();
  return result.ok ? result.settings : null;
}
