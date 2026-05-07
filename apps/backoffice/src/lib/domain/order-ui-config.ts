import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_SELECT_SEQUENCE,
} from "@/lib/domain/order-status";

/** 全部工单列表用到的枚举键（含返修与 legacy waiting_pickup） */
export const KNOWN_ORDER_STATUSES = [...ORDER_STATUS_SELECT_SEQUENCE] as readonly string[];

const KNOWN_SET = new Set(KNOWN_ORDER_STATUSES);

export type PaletteKey = "rose" | "blue" | "amber" | "teal" | "emerald" | "neutral";

export const PALETTE_OPTIONS: PaletteKey[] = ["rose", "blue", "amber", "teal", "emerald", "neutral"];

export type OrderUiConfigV1 = {
  version: 1;
  statusLabels?: Partial<Record<string, string>>;
  statusOrder?: string[];
  macroGroups?: Array<{
    id: string;
    label?: string;
    statuses?: string[];
    defaultOpenDesktop?: boolean;
    palette?: PaletteKey;
  }>;
  mailInOrderType?: "quick_repair" | "dropoff_repair";
  sectionTitles?: { mail?: string; shop?: string };
};

export type ResolvedMacroGroup = {
  id: string;
  label: string;
  statuses: string[];
  defaultOpenDesktop: boolean;
  titleColor: string;
  bgColor: string;
  palette: PaletteKey;
};

export type ResolvedOrderUi = {
  statusLabels: Record<string, string>;
  /** 决定了列表主排序与下拉顺序（全集固定一组字符串） */
  statusOrder: readonly string[];
  macroGroups: ResolvedMacroGroup[];
  mailInOrderType: "quick_repair" | "dropoff_repair";
  /** 列表行寄修/到店 pill 文案 */
  sectionTitles: { mail: string; shop: string };
};

const PALETTE_STYLES: Record<
  PaletteKey,
  { titleColor: string; bgColor: string }
> = {
  rose: { titleColor: "text-rose-700", bgColor: "bg-rose-50" },
  blue: { titleColor: "text-blue-700", bgColor: "bg-blue-50" },
  amber: { titleColor: "text-amber-800", bgColor: "bg-amber-50" },
  teal: { titleColor: "text-teal-800", bgColor: "bg-teal-50" },
  emerald: { titleColor: "text-emerald-800", bgColor: "bg-emerald-50" },
  neutral: { titleColor: "text-neutral-600", bgColor: "bg-neutral-50" },
};

const MACRO_IDS = ["rework", "new", "processing", "pickup", "completed", "cancelled"] as const;

type MacroId = (typeof MACRO_IDS)[number];

const DEFAULT_MACRO_DEF: Record<
  MacroId,
  {
    label: string;
    statuses: readonly string[];
    palette: PaletteKey;
    defaultOpenDesktop: boolean;
  }
> = {
  rework: {
    label: "返修",
    statuses: ["rework"],
    palette: "rose",
    defaultOpenDesktop: true,
  },
  new: {
    label: "接单",
    statuses: ["new"],
    palette: "blue",
    defaultOpenDesktop: true,
  },
  processing: {
    label: "处理中",
    statuses: [
      "diagnosing",
      "quoted",
      "waiting_approval",
      "repairing",
      "parts_ordered",
      "parts_arrived",
    ],
    palette: "amber",
    defaultOpenDesktop: true,
  },
  pickup: {
    label: "待取件",
    statuses: ["repaired", "notified", "unfixed_pickup", "waiting_pickup"],
    palette: "teal",
    defaultOpenDesktop: true,
  },
  completed: {
    label: "已完成",
    statuses: ["completed"],
    palette: "emerald",
    defaultOpenDesktop: false,
  },
  cancelled: {
    label: "已取消",
    statuses: ["cancelled"],
    palette: "neutral",
    defaultOpenDesktop: false,
  },
};

const DEFAULT_MAIL_TYPE = "quick_repair" as const;
/** 列表行寄修/到店标识文案（非顶层分段标题） */
const DEFAULT_SECTION_TITLES = { mail: "寄修", shop: "到店" };

function isMacroId(s: string): s is MacroId {
  return (MACRO_IDS as readonly string[]).includes(s);
}

function isPaletteKey(s: string): s is PaletteKey {
  return s in PALETTE_STYLES;
}

/** 默认排序：与 domain ORDER_STATUS_SELECT_SEQUENCE 一致 */
export const DEFAULT_STATUS_ORDER: readonly string[] = KNOWN_ORDER_STATUSES;

export function defaultResolvedOrderUi(): ResolvedOrderUi {
  const statusLabels: Record<string, string> = { ...ORDER_STATUS_LABELS };
  const macroGroups: ResolvedMacroGroup[] = MACRO_IDS.map((id) => {
    const def = DEFAULT_MACRO_DEF[id];
    const pal = PALETTE_STYLES[def.palette];
    return {
      id,
      label: def.label,
      statuses: [...def.statuses],
      defaultOpenDesktop: def.defaultOpenDesktop,
      titleColor: pal.titleColor,
      bgColor: pal.bgColor,
      palette: def.palette,
    };
  });
  return {
    statusLabels,
    statusOrder: [...DEFAULT_STATUS_ORDER],
    macroGroups,
    mailInOrderType: DEFAULT_MAIL_TYPE,
    sectionTitles: { ...DEFAULT_SECTION_TITLES },
  };
}

function normalizePermutation(order: string[]): string[] | null {
  if (order.length !== KNOWN_ORDER_STATUSES.length) return null;
  const seen = new Set<string>();
  for (const s of order) {
    if (!KNOWN_SET.has(s) || seen.has(s)) return null;
    seen.add(s);
  }
  return order;
}

/** 若任意 macro 自定义了 statuses，则须划分全集且无重叠 */
function mergeMacroMemberships(
  dbMacros: OrderUiConfigV1["macroGroups"],
): Record<MacroId, string[]> | null {
  const base: Record<MacroId, string[]> = {} as Record<MacroId, string[]>;
  for (const id of MACRO_IDS) {
    base[id] = [...DEFAULT_MACRO_DEF[id].statuses];
  }
  if (!dbMacros?.length) return base;

  let anyCustom = false;
  const merged: Record<MacroId, string[]> = {} as Record<MacroId, string[]>;
  for (const id of MACRO_IDS) {
    const row = dbMacros.find((m) => m.id === id);
    if (row?.statuses && row.statuses.length > 0) {
      merged[id] = [...row.statuses];
      anyCustom = true;
    } else {
      merged[id] = [...DEFAULT_MACRO_DEF[id].statuses];
    }
  }
  if (!anyCustom) return base;

  const seen = new Set<string>();
  for (const id of MACRO_IDS) {
    for (const s of merged[id]) {
      if (!KNOWN_SET.has(s) || seen.has(s)) return null;
      seen.add(s);
    }
  }
  if (seen.size !== KNOWN_ORDER_STATUSES.length) return null;
  return merged;
}

function macroSortOrder(dbMacros: OrderUiConfigV1["macroGroups"]): MacroId[] {
  if (!dbMacros?.length) return [...MACRO_IDS];
  const ordered: MacroId[] = [];
  const seen = new Set<string>();
  for (const m of dbMacros) {
    if (isMacroId(m.id) && !seen.has(m.id)) {
      ordered.push(m.id);
      seen.add(m.id);
    }
  }
  for (const id of MACRO_IDS) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

/** 将 DB json（未知形状）合并为运行时 ResolvedOrderUi；永不抛错 */
export function resolveOrderUiFromRaw(raw: unknown): ResolvedOrderUi {
  const base = defaultResolvedOrderUi();
  const parsed = parseOrderUiConfigLoose(raw);
  if (!parsed) return base;

  const labels = { ...base.statusLabels };
  if (parsed.statusLabels) {
    for (const [k, v] of Object.entries(parsed.statusLabels)) {
      if (!KNOWN_SET.has(k)) continue;
      const t = typeof v === "string" ? v.trim() : "";
      if (t.length > 0) labels[k] = t;
    }
  }

  let statusOrder: readonly string[] = base.statusOrder;
  if (parsed.statusOrder?.length) {
    const norm = normalizePermutation(parsed.statusOrder);
    if (norm) statusOrder = norm;
  }

  const memberships = mergeMacroMemberships(parsed.macroGroups);
  const order = macroSortOrder(parsed.macroGroups);

  const macroGroups: ResolvedMacroGroup[] = order.map((id) => {
    const def = DEFAULT_MACRO_DEF[id];
    const row = parsed.macroGroups?.find((m) => m.id === id);
    const palKey: PaletteKey =
      row?.palette && isPaletteKey(row.palette) ? row.palette : def.palette;
    const styles = PALETTE_STYLES[palKey];

    const statuses =
      memberships && memberships[id] ? memberships[id] : [...def.statuses];

    const label =
      typeof row?.label === "string" && row.label.trim().length > 0
        ? row.label.trim()
        : def.label;

    const defaultOpenDesktop =
      typeof row?.defaultOpenDesktop === "boolean"
        ? row.defaultOpenDesktop
        : def.defaultOpenDesktop;

    return {
      id,
      label,
      statuses,
      defaultOpenDesktop,
      titleColor: styles.titleColor,
      bgColor: styles.bgColor,
      palette: palKey,
    };
  });

  const mailInOrderType =
    parsed.mailInOrderType === "dropoff_repair" ||
    parsed.mailInOrderType === "quick_repair"
      ? parsed.mailInOrderType
      : base.mailInOrderType;

  const sectionTitles = {
    mail:
      typeof parsed.sectionTitles?.mail === "string" &&
      parsed.sectionTitles.mail.trim().length > 0
        ? parsed.sectionTitles.mail.trim()
        : base.sectionTitles.mail,
    shop:
      typeof parsed.sectionTitles?.shop === "string" &&
      parsed.sectionTitles.shop.trim().length > 0
        ? parsed.sectionTitles.shop.trim()
        : base.sectionTitles.shop,
  };

  return {
    statusLabels: labels,
    statusOrder,
    macroGroups,
    mailInOrderType,
    sectionTitles,
  };
}

function parseOrderUiConfigLoose(raw: unknown): OrderUiConfigV1 | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  const out: OrderUiConfigV1 = { version: 1 };

  if (isPlainObject(o.statusLabels)) {
    const sl: Partial<Record<string, string>> = {};
    for (const [k, v] of Object.entries(o.statusLabels)) {
      if (typeof v === "string") sl[k] = v;
    }
    if (Object.keys(sl).length > 0) out.statusLabels = sl;
  }

  if (Array.isArray(o.statusOrder) && o.statusOrder.every((x) => typeof x === "string")) {
    out.statusOrder = o.statusOrder as string[];
  }

  if (Array.isArray(o.macroGroups)) {
    const macros: OrderUiConfigV1["macroGroups"] = [];
    for (const item of o.macroGroups) {
      if (!isPlainObject(item)) continue;
      const id = typeof item.id === "string" ? item.id : "";
      if (!isMacroId(id)) continue;
      const entry: NonNullable<OrderUiConfigV1["macroGroups"]>[number] = { id };
      if (typeof item.label === "string") entry.label = item.label;
      if (typeof item.defaultOpenDesktop === "boolean") {
        entry.defaultOpenDesktop = item.defaultOpenDesktop;
      }
      if (typeof item.palette === "string" && isPaletteKey(item.palette)) {
        entry.palette = item.palette;
      }
      if (Array.isArray(item.statuses) && item.statuses.every((x) => typeof x === "string")) {
        entry.statuses = item.statuses as string[];
      }
      macros.push(entry);
    }
    if (macros.length > 0) out.macroGroups = macros;
  }

  if (o.mailInOrderType === "quick_repair" || o.mailInOrderType === "dropoff_repair") {
    out.mailInOrderType = o.mailInOrderType;
  }

  if (isPlainObject(o.sectionTitles)) {
    const st: { mail?: string; shop?: string } = {};
    if (typeof o.sectionTitles.mail === "string") st.mail = o.sectionTitles.mail;
    if (typeof o.sectionTitles.shop === "string") st.shop = o.sectionTitles.shop;
    if (st.mail != null || st.shop != null) out.sectionTitles = st;
  }

  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** PATCH 写入前校验；失败时不落库 */
export function validateOrderUiConfigPatch(raw: unknown): { ok: true; value: OrderUiConfigV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (raw == null) return { ok: false, errors: ["orderUiConfig 不能为空"] };
  if (!isPlainObject(raw)) return { ok: false, errors: ["orderUiConfig 必须是对象"] };
  if (raw.version !== 1) return { ok: false, errors: ["version 必须为 1"] };

  const value: OrderUiConfigV1 = { version: 1 };

  if (raw.statusLabels !== undefined) {
    if (!isPlainObject(raw.statusLabels)) {
      errors.push("statusLabels 必须是对象");
    } else {
      const sl: Partial<Record<string, string>> = {};
      for (const [k, v] of Object.entries(raw.statusLabels)) {
        if (!KNOWN_SET.has(k)) {
          errors.push(`未知状态键: ${k}`);
          continue;
        }
        if (typeof v !== "string" || v.trim().length === 0) {
          errors.push(`状态 ${k} 的文案无效`);
          continue;
        }
        sl[k] = v.trim();
      }
      value.statusLabels = sl;
    }
  }

  if (raw.statusOrder !== undefined) {
    if (!Array.isArray(raw.statusOrder) || !raw.statusOrder.every((x) => typeof x === "string")) {
      errors.push("statusOrder 必须是非空字符串数组");
    } else {
      const norm = normalizePermutation(raw.statusOrder as string[]);
      if (!norm) errors.push("statusOrder 必须是已知状态的全排列");
      else value.statusOrder = norm;
    }
  }

  if (raw.macroGroups !== undefined) {
    if (!Array.isArray(raw.macroGroups)) {
      errors.push("macroGroups 必须是数组");
    } else if (raw.macroGroups.length === 0) {
      errors.push("macroGroups 不能为空");
    } else {
      const macros: NonNullable<OrderUiConfigV1["macroGroups"]> = [];
      const idSeen = new Set<string>();
      for (let i = 0; i < raw.macroGroups.length; i++) {
        const item = raw.macroGroups[i];
        if (!isPlainObject(item)) {
          errors.push(`macroGroups[${i}] 必须是对象`);
          continue;
        }
        if (typeof item.id !== "string" || !isMacroId(item.id)) {
          errors.push(`macroGroups[${i}].id 无效`);
          continue;
        }
        if (idSeen.has(item.id)) {
          errors.push(`macroGroups 中存在重复 id: ${item.id}`);
          continue;
        }
        idSeen.add(item.id);
        const entry: NonNullable<OrderUiConfigV1["macroGroups"]>[number] = { id: item.id };
        if (item.label !== undefined) {
          if (typeof item.label !== "string" || item.label.trim().length === 0) {
            errors.push(`macroGroups[${i}].label 无效`);
          } else entry.label = item.label.trim();
        }
        if (item.defaultOpenDesktop !== undefined) {
          if (typeof item.defaultOpenDesktop !== "boolean") {
            errors.push(`macroGroups[${i}].defaultOpenDesktop 必须是布尔`);
          } else entry.defaultOpenDesktop = item.defaultOpenDesktop;
        }
        if (item.palette !== undefined) {
          if (typeof item.palette !== "string" || !isPaletteKey(item.palette)) {
            errors.push(`macroGroups[${i}].palette 无效`);
          } else entry.palette = item.palette;
        }
        if (item.statuses !== undefined) {
          if (!Array.isArray(item.statuses) || !item.statuses.every((x) => typeof x === "string")) {
            errors.push(`macroGroups[${i}].statuses 必须是字符串数组`);
          } else entry.statuses = item.statuses as string[];
        }
        macros.push(entry);
      }
      value.macroGroups = macros;

      for (const req of MACRO_IDS) {
        if (!macros.some((m) => m.id === req)) {
          errors.push(`macroGroups 缺少分组: ${req}`);
        }
      }

      const memberships = mergeMacroMemberships(macros);
      if (!memberships) errors.push("macroGroups.statuses 划分无效（须覆盖全部状态且无重叠）");
    }
  }

  if (raw.mailInOrderType !== undefined) {
    if (raw.mailInOrderType !== "quick_repair" && raw.mailInOrderType !== "dropoff_repair") {
      errors.push("mailInOrderType 无效");
    } else value.mailInOrderType = raw.mailInOrderType;
  }

  if (raw.sectionTitles !== undefined) {
    if (!isPlainObject(raw.sectionTitles)) {
      errors.push("sectionTitles 必须是对象");
    } else {
      const st: { mail?: string; shop?: string } = {};
      if (raw.sectionTitles.mail !== undefined) {
        if (typeof raw.sectionTitles.mail !== "string" || raw.sectionTitles.mail.trim().length === 0) {
          errors.push("sectionTitles.mail 无效");
        } else st.mail = raw.sectionTitles.mail.trim();
      }
      if (raw.sectionTitles.shop !== undefined) {
        if (typeof raw.sectionTitles.shop !== "string" || raw.sectionTitles.shop.trim().length === 0) {
          errors.push("sectionTitles.shop 无效");
        } else st.shop = raw.sectionTitles.shop.trim();
      }
      value.sectionTitles = st;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export function resolveStatusLabel(status: string, r: ResolvedOrderUi): string {
  return r.statusLabels[status] ?? ORDER_STATUS_LABELS[status] ?? status;
}

export function getStatusListSortIndexResolved(status: string, r: ResolvedOrderUi): number {
  const idx = r.statusOrder.indexOf(status);
  return idx === -1 ? r.statusOrder.length + 100 : idx;
}

export function getOrderStatusSelectOptionsResolved(r: ResolvedOrderUi): { value: string; label: string }[] {
  return r.statusOrder.map((value) => ({
    value,
    label: resolveStatusLabel(value, r),
  }));
}

/** JSON 可序列化 DTO（下发客户端） */
export type ResolvedOrderUiJson = {
  statusLabels: Record<string, string>;
  statusOrder: string[];
  macroGroups: ResolvedMacroGroup[];
  mailInOrderType: "quick_repair" | "dropoff_repair";
  sectionTitles: { mail: string; shop: string };
};

export function resolvedOrderUiToJson(r: ResolvedOrderUi): ResolvedOrderUiJson {
  return {
    statusLabels: { ...r.statusLabels },
    statusOrder: [...r.statusOrder],
    macroGroups: r.macroGroups.map((m) => ({
      ...m,
      statuses: [...m.statuses],
      palette: m.palette,
    })),
    mailInOrderType: r.mailInOrderType,
    sectionTitles: { ...r.sectionTitles },
  };
}

export function resolvedOrderUiFromJson(j: ResolvedOrderUiJson): ResolvedOrderUi {
  return {
    statusLabels: { ...j.statusLabels },
    statusOrder: [...j.statusOrder],
    macroGroups: j.macroGroups.map((m) => ({
      ...m,
      statuses: [...m.statuses],
      palette: m.palette,
    })),
    mailInOrderType: j.mailInOrderType,
    sectionTitles: { ...j.sectionTitles },
  };
}

/** 写入 DB 的完整快照（设置页保存） */
export function resolvedOrderUiToStored(r: ResolvedOrderUi): OrderUiConfigV1 {
  return {
    version: 1,
    statusLabels: { ...r.statusLabels },
    statusOrder: [...r.statusOrder],
    macroGroups: r.macroGroups.map((m) => ({
      id: m.id,
      label: m.label,
      statuses: [...m.statuses],
      defaultOpenDesktop: m.defaultOpenDesktop,
      palette: m.palette,
    })),
    mailInOrderType: r.mailInOrderType,
    sectionTitles: { mail: r.sectionTitles.mail, shop: r.sectionTitles.shop },
  };
}

/**
 * 设置保存专用：必须包含全部分组与全部状态文案，避免 PATCH 写入不完整 JSON。
 */
export function validateOrderUiConfigFullSnapshot(
  raw: unknown,
): { ok: true; value: OrderUiConfigV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isPlainObject(raw) || raw.version !== 1) {
    return { ok: false, errors: ["orderUiConfig 必须为 version 1 对象"] };
  }

  const sl: Record<string, string> = {};
  if (!isPlainObject(raw.statusLabels)) {
    errors.push("statusLabels 必填（对象）");
  } else {
    for (const k of KNOWN_ORDER_STATUSES) {
      const v = raw.statusLabels[k];
      if (typeof v !== "string" || !v.trim()) {
        errors.push(`缺少状态文案: ${k}`);
      } else {
        sl[k] = v.trim();
      }
    }
  }

  let normOrder: string[] | null = null;
  if (!Array.isArray(raw.statusOrder) || !raw.statusOrder.every((x) => typeof x === "string")) {
    errors.push("statusOrder 必须为字符串数组");
  } else {
    normOrder = normalizePermutation(raw.statusOrder as string[]);
    if (!normOrder) errors.push("statusOrder 必须为已知状态的全排列");
  }

  if (!Array.isArray(raw.macroGroups) || raw.macroGroups.length === 0) {
    errors.push("macroGroups 不能为空");
  }

  const macros: NonNullable<OrderUiConfigV1["macroGroups"]> = [];
  if (Array.isArray(raw.macroGroups)) {
    const idSeen = new Set<string>();
    for (let i = 0; i < raw.macroGroups.length; i++) {
      const item = raw.macroGroups[i];
      if (!isPlainObject(item)) {
        errors.push(`macroGroups[${i}] 必须是对象`);
        continue;
      }
      if (typeof item.id !== "string" || !isMacroId(item.id)) {
        errors.push(`macroGroups[${i}].id 无效`);
        continue;
      }
      if (idSeen.has(item.id)) {
        errors.push(`macroGroups 中存在重复 id: ${item.id}`);
        continue;
      }
      idSeen.add(item.id);
      const entry: NonNullable<OrderUiConfigV1["macroGroups"]>[number] = { id: item.id };
      if (typeof item.label !== "string" || !item.label.trim()) {
        errors.push(`macroGroups[${i}].label 必填`);
      } else entry.label = item.label.trim();
      if (typeof item.defaultOpenDesktop !== "boolean") {
        errors.push(`macroGroups[${i}].defaultOpenDesktop 必填（布尔）`);
      } else entry.defaultOpenDesktop = item.defaultOpenDesktop;
      if (typeof item.palette !== "string" || !isPaletteKey(item.palette)) {
        errors.push(`macroGroups[${i}].palette 无效`);
      } else entry.palette = item.palette;
      if (!Array.isArray(item.statuses) || !item.statuses.every((x) => typeof x === "string")) {
        errors.push(`macroGroups[${i}].statuses 必须为字符串数组`);
      } else {
        entry.statuses = [...(item.statuses as string[])];
      }
      macros.push(entry);
    }
    for (const req of MACRO_IDS) {
      if (!macros.some((m) => m.id === req)) {
        errors.push(`缺少 macro 分组: ${req}`);
      }
    }
  }

  if (macros.length > 0 && !mergeMacroMemberships(macros)) {
    errors.push("macroGroups.statuses 划分无效（须覆盖全部状态且无重叠）");
  }

  if (raw.mailInOrderType !== "quick_repair" && raw.mailInOrderType !== "dropoff_repair") {
    errors.push("mailInOrderType 必填：quick_repair | dropoff_repair");
  }

  let mailTitle = "";
  let shopTitle = "";
  if (!isPlainObject(raw.sectionTitles)) {
    errors.push("sectionTitles 必填");
  } else {
    if (typeof raw.sectionTitles.mail !== "string" || !raw.sectionTitles.mail.trim()) {
      errors.push("sectionTitles.mail 必填");
    } else mailTitle = raw.sectionTitles.mail.trim();
    if (typeof raw.sectionTitles.shop !== "string" || !raw.sectionTitles.shop.trim()) {
      errors.push("sectionTitles.shop 必填");
    } else shopTitle = raw.sectionTitles.shop.trim();
  }

  if (errors.length > 0) return { ok: false, errors };
  if (!normOrder) return { ok: false, errors: ["statusOrder 无效"] };

  const value: OrderUiConfigV1 = {
    version: 1,
    statusLabels: sl,
    statusOrder: normOrder,
    macroGroups: macros,
    mailInOrderType: raw.mailInOrderType as "quick_repair" | "dropoff_repair",
    sectionTitles: { mail: mailTitle, shop: shopTitle },
  };

  return { ok: true, value };
}
