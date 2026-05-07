import {
  extractFaultExtraNote,
  parseFaultsFromIssue,
} from "@/lib/domain/fault-types";

/** Mirrors fault-types keys — Italian labels for customer-facing print */
const FAULT_IT: Record<string, { category: string; subs?: Record<string, string> }> = {
  screen: {
    category: "Display",
    subs: {
      screen_crack: "vetro esterno rotto",
      screen_lcd: "perdita LCD / macchie",
      screen_touch: "touch non reattivo",
    },
  },
  battery: {
    category: "Batteria",
    subs: {
      battery_swell: "rigonfiamento",
      battery_nocharge: "non carica",
      battery_drain: "scarica rapida",
    },
  },
  charging: {
    category: "Connettore di ricarica",
    subs: {
      charging_loose: "connettore allentato",
      charging_fail: "non ricarica",
    },
  },
  camera: {
    category: "Fotocamera",
    subs: {
      camera_front: "frontale",
      camera_rear: "posteriore",
      camera_flash: "flash",
    },
  },
  water: { category: "Danno da liquidi" },
  motherboard: {
    category: "Scheda madre",
    subs: {
      mb_short: "cortocircuito",
      mb_chip: "guasto chip",
    },
  },
  system: {
    category: "Software / sistema",
    subs: {
      sys_crash: "ripristini / riavvii",
      sys_update: "aggiornamento fallito",
      sys_flash: "ripristino firmware",
    },
  },
  backcover: {
    category: "Scocca posteriore",
    subs: {
      back_crack: "rottura",
      back_loose: "allentata",
    },
  },
  faceid: {
    category: "Face ID / impronta",
    subs: {
      face_id: "Face ID",
      touch_id: "Touch ID",
    },
  },
  speaker: {
    category: "Altoparlanti",
    subs: {
      speaker_top: "auricolare",
      speaker_bottom: "altoparlante basso",
    },
  },
  mic: {
    category: "Microfoni",
    subs: {
      mic_main: "principale",
      mic_sub: "secondario",
    },
  },
  buttons: {
    category: "Tasti",
    subs: {
      btn_power: "accensione",
      btn_volume: "volume",
      btn_mute: "silenzioso",
    },
  },
};

const KEY_ORDER = Object.keys(FAULT_IT);

function italianLabelForFaultKey(key: string, selected: string[]): string {
  const meta = FAULT_IT[key];
  if (!meta) return key;

  if (!meta.subs || selected.includes("_self")) {
    return meta.category;
  }
  const subLabels = selected
    .map((sk) => meta.subs?.[sk])
    .filter(Boolean) as string[];
  if (subLabels.length > 0) {
    return `${meta.category} (${subLabels.join(", ")})`;
  }
  return meta.category;
}

/** Italian fault line for customer-facing text (print, WhatsApp, etc.) */
export function faultLineLabelItalian(key: string, selectedSubs: string[]): string {
  return italianLabelForFaultKey(key, selectedSubs);
}

export function buildFaultPriceLinesItalian(
  faultMap: Map<string, string[]>,
  faultPrices: Record<string, string>,
): { labelIt: string; amountEur: number | null }[] {
  const lines: { labelIt: string; amountEur: number | null }[] = [];
  for (const key of KEY_ORDER) {
    const selected = faultMap.get(key);
    if (!selected || selected.length === 0) continue;
    const labelIt = italianLabelForFaultKey(key, selected);
    const raw = faultPrices[key];
    const n = raw != null && raw !== "" ? Number(raw) : NaN;
    const amountEur = Number.isFinite(n) ? n : null;
    lines.push({ labelIt, amountEur });
  }
  return lines;
}

/**
 * For saved orders: DB has only total quotation — split evenly across parsed fault keys (same heuristic as FinanceCard).
 */
export function buildFaultPriceLinesFromStoredIssue(
  issueDescription: string,
  faultPrices: Record<string, string>,
): { labelIt: string; amountEur: number | null }[] {
  const map = parseFaultsFromIssue(issueDescription);
  const lines: { labelIt: string; amountEur: number | null }[] = [];
  for (const key of KEY_ORDER) {
    const selected = map.get(key);
    if (!selected || selected.length === 0) continue;
    const raw = faultPrices[key];
    const n = raw != null && raw !== "" ? Number(raw) : NaN;
    lines.push({
      labelIt: italianLabelForFaultKey(key, selected),
      amountEur: Number.isFinite(n) ? n : null,
    });
  }
  return lines;
}

export function buildIssueItalianFromFaults(
  faultMap: Map<string, string[]>,
  extraNote: string,
): string {
  const parts: string[] = [];

  for (const key of KEY_ORDER) {
    const selected = faultMap.get(key);
    if (!selected || selected.length === 0) continue;
    parts.push(italianLabelForFaultKey(key, selected));
  }

  if (extraNote.trim()) parts.push(extraNote.trim());
  return parts.join("; ") || "—";
}

export function issueSummaryForPrintIt(issue: string): {
  summaryIt: string;
  originalUnparsed?: string;
} {
  const trimmed = issue.trim();
  if (!trimmed) return { summaryIt: "—" };

  const map = parseFaultsFromIssue(trimmed);
  let extra = extractFaultExtraNote(trimmed);

  // Secondary translation: if leftover extra still contains Chinese fault patterns, translate them
  if (extra && /[\u4e00-\u9fff]/.test(extra)) {
    const extraMap = parseFaultsFromIssue(extra);
    if (extraMap.size > 0) {
      const translatedPart = buildIssueItalianFromFaults(extraMap, "");
      const remainingExtra = extractFaultExtraNote(extra);
      extra = [translatedPart, remainingExtra].filter(Boolean).join("; ");
    }
  }

  const summaryIt = buildIssueItalianFromFaults(map, extra);

  // Only flag as unparsed if genuinely untranslatable Chinese remains
  if (extra && /[\u4e00-\u9fff]/.test(extra)) {
    return { summaryIt, originalUnparsed: trimmed };
  }
  return { summaryIt };
}
