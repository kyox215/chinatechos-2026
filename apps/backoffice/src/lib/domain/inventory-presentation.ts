import type { InventoryLifecycle, ProductChannel } from "@/lib/data/inventory";

const CHANNEL_LABEL: Record<ProductChannel, string> = {
  new_retail: "新机",
  refurbished: "翻新",
  trade_in: "回收",
};

const STATUS_LABEL: Record<InventoryLifecycle, string> = {
  draft: "草稿",
  in_stock: "在库",
  reserved: "预留",
  sold: "已售",
  cancelled: "已取消",
};

const STATUS_CLASS: Record<InventoryLifecycle, string> = {
  draft: "bg-slate-100 text-slate-800 ring-slate-200",
  in_stock: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  reserved: "bg-amber-50 text-amber-900 ring-amber-200",
  sold: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  cancelled: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function presentInventoryChannel(ch: string): string {
  return CHANNEL_LABEL[ch as ProductChannel] ?? ch;
}

export function presentInventoryStatus(st: string): string {
  return STATUS_LABEL[st as InventoryLifecycle] ?? st;
}

export function inventoryStatusClass(st: string): string {
  return STATUS_CLASS[st as InventoryLifecycle] ?? "bg-surface-2 text-neutral-700 ring-border";
}

export function formatInventoryBadgesFromQa(qa: Record<string, unknown> | null | undefined): string[] {
  if (qa == null || typeof qa !== "object" || Array.isArray(qa)) {
    return [];
  }
  const badges: string[] = [];
  const LABEL_CN: Record<string, string> = {
    screen_crack: "屏幕裂",
    camera_lens_scratch: "摄像头花",
    housing_scratch: "外壳划痕",
    battery_low: "电池老化",
  };
  for (const [, v] of Object.entries(qa)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as { result?: string; label_keys?: string[] };
      if (o.result === "defect" && o.label_keys?.length) {
        for (const k of o.label_keys) {
          badges.push(LABEL_CN[k] ?? k);
        }
      }
    }
  }
  return badges.slice(0, 4);
}
