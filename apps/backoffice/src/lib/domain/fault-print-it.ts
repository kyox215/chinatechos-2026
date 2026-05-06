import {
  buildIssueFromFaults,
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

export function buildIssueItalianFromFaults(
  faultMap: Map<string, string[]>,
  extraNote: string,
): string {
  const parts: string[] = [];

  for (const key of KEY_ORDER) {
    const meta = FAULT_IT[key];
    const selected = faultMap.get(key);
    if (!selected || selected.length === 0) continue;

    if (!meta.subs || selected.includes("_self")) {
      parts.push(meta.category);
    } else {
      const subLabels = selected
        .map((sk) => meta.subs?.[sk])
        .filter(Boolean) as string[];
      if (subLabels.length > 0) {
        parts.push(`${meta.category} (${subLabels.join(", ")})`);
      } else {
        parts.push(meta.category);
      }
    }
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
  const extra = extractFaultExtraNote(trimmed);
  const rebuiltCn = buildIssueFromFaults(map, extra);
  const summaryIt = buildIssueItalianFromFaults(map, extra);

  if (rebuiltCn !== trimmed) {
    return { summaryIt, originalUnparsed: trimmed };
  }
  return { summaryIt };
}
