import type { ReactNode } from "react";
import {
  IconScreen, IconBattery, IconCharging, IconCamera, IconWater,
  IconMotherboard, IconSystem, IconBackcover, IconFaceId, IconSpeaker,
  IconMic, IconButtons,
} from "@/components/icons";

export type SubFault = { key: string; label: string };

export type FaultType = {
  key: string;
  label: string;
  icon: ReactNode;
  subTypes?: SubFault[];
};

export const FAULT_TYPES: FaultType[] = [
  {
    key: "screen", label: "屏幕", icon: <IconScreen className="h-4 w-4" />,
    subTypes: [
      { key: "screen_crack", label: "外屏碎裂" },
      { key: "screen_lcd", label: "内屏漏液" },
      { key: "screen_touch", label: "触摸失灵" },
    ],
  },
  {
    key: "battery", label: "电池", icon: <IconBattery className="h-4 w-4" />,
    subTypes: [
      { key: "battery_swell", label: "电池膨胀" },
      { key: "battery_nocharge", label: "不充电" },
      { key: "battery_drain", label: "耗电快" },
    ],
  },
  {
    key: "charging", label: "尾插", icon: <IconCharging className="h-4 w-4" />,
    subTypes: [
      { key: "charging_loose", label: "充电口松动" },
      { key: "charging_fail", label: "无法充电" },
    ],
  },
  {
    key: "camera", label: "摄像头", icon: <IconCamera className="h-4 w-4" />,
    subTypes: [
      { key: "camera_front", label: "前摄" },
      { key: "camera_rear", label: "后摄" },
      { key: "camera_flash", label: "闪光灯" },
    ],
  },
  { key: "water", label: "进水", icon: <IconWater className="h-4 w-4" /> },
  {
    key: "motherboard", label: "主板", icon: <IconMotherboard className="h-4 w-4" />,
    subTypes: [
      { key: "mb_short", label: "主板短路" },
      { key: "mb_chip", label: "芯片故障" },
    ],
  },
  {
    key: "system", label: "系统", icon: <IconSystem className="h-4 w-4" />,
    subTypes: [
      { key: "sys_crash", label: "死机重启" },
      { key: "sys_update", label: "更新失败" },
      { key: "sys_flash", label: "刷机" },
    ],
  },
  {
    key: "backcover", label: "后盖", icon: <IconBackcover className="h-4 w-4" />,
    subTypes: [
      { key: "back_crack", label: "后盖碎裂" },
      { key: "back_loose", label: "后盖松动" },
    ],
  },
  {
    key: "faceid", label: "面容/指纹", icon: <IconFaceId className="h-4 w-4" />,
    subTypes: [
      { key: "face_id", label: "Face ID" },
      { key: "touch_id", label: "Touch ID/指纹" },
    ],
  },
  {
    key: "speaker", label: "扬声器", icon: <IconSpeaker className="h-4 w-4" />,
    subTypes: [
      { key: "speaker_top", label: "上扬声器(听筒)" },
      { key: "speaker_bottom", label: "下扬声器(外放)" },
    ],
  },
  {
    key: "mic", label: "麦克风", icon: <IconMic className="h-4 w-4" />,
    subTypes: [
      { key: "mic_main", label: "主麦" },
      { key: "mic_sub", label: "副麦" },
    ],
  },
  {
    key: "buttons", label: "按键", icon: <IconButtons className="h-4 w-4" />,
    subTypes: [
      { key: "btn_power", label: "电源键" },
      { key: "btn_volume", label: "音量键" },
      { key: "btn_mute", label: "静音键" },
    ],
  },
];

/**
 * Build issue description from selected faults.
 * faultMap: key = main fault key, value = array of selected sub-fault keys (or ["_self"] for no-sub faults)
 */
export function buildIssueFromFaults(
  faultMap: Map<string, string[]>,
  extraNote: string,
): string {
  const parts: string[] = [];

  for (const ft of FAULT_TYPES) {
    const selected = faultMap.get(ft.key);
    if (!selected || selected.length === 0) continue;

    if (!ft.subTypes || selected.includes("_self")) {
      parts.push(ft.label);
    } else {
      const subLabels = selected
        .map((sk) => ft.subTypes!.find((s) => s.key === sk)?.label)
        .filter(Boolean);
      if (subLabels.length > 0) {
        parts.push(`${ft.label}(${subLabels.join(", ")})`);
      } else {
        parts.push(ft.label);
      }
    }
  }

  if (extraNote.trim()) parts.push(extraNote.trim());
  return parts.join("; ") || "未填写问题描述";
}

/**
 * Parse issue description back into a fault map (best-effort for edit modal).
 */
export function parseFaultsFromIssue(issue: string): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const ft of FAULT_TYPES) {
    if (!ft.subTypes) {
      if (issue.includes(ft.label)) {
        map.set(ft.key, ["_self"]);
      }
    } else {
      const matchedSubs: string[] = [];
      for (const sub of ft.subTypes) {
        if (issue.includes(sub.label)) {
          matchedSubs.push(sub.key);
        }
      }
      if (matchedSubs.length > 0) {
        map.set(ft.key, matchedSubs);
      } else if (issue.includes(ft.label)) {
        map.set(ft.key, ["_self"]);
      }
    }
  }

  return map;
}


/**
 * Text in issue_description that is not represented by structured fault labels (best-effort).
 * Uses pattern-stripping instead of exact string comparison so sub-fault ordering differences
 * (user selection order vs FAULT_TYPES definition order) don't cause Chinese leakage.
 */
export function extractFaultExtraNote(issue: string): string {
  const trimmed = issue.trim();
  if (!trimmed) return "";
  const map = parseFaultsFromIssue(trimmed);
  if (map.size === 0) return trimmed;

  let remaining = trimmed;
  for (const ft of FAULT_TYPES) {
    const selected = map.get(ft.key);
    if (!selected || selected.length === 0) continue;
    if (ft.subTypes && !selected.includes("_self")) {
      const escaped = ft.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      remaining = remaining.replace(new RegExp(escaped + "\\s*\\([^)]*\\)"), "");
    } else {
      remaining = remaining.replace(ft.label, "");
    }
  }
  return remaining
    .replace(/^[;；\s,]+/, "")
    .replace(/[;；\s,]+$/, "")
    .replace(/[;；]\s*[;；]/g, ";")
    .trim();
}
