"use client";

import type { ReactNode } from "react";
import { IconPlus, IconArrowPath, IconCheck, IconEnvelope, IconFlag, IconPencil } from "@/components/icons";
import { InventoryLinkagePayloadKey } from "@/lib/domain/inventory-linkage-payload";
import { presentInventoryChannel, presentInventoryStatus } from "@/lib/domain/inventory-presentation";

export type InventoryEventVM = {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  operatorName: string | null;
  createdAt: string;
};

const EVENT_ICONS: Record<string, ReactNode> = {
  created: <IconPlus />,
  status_changed: <IconArrowPath />,
  qa_saved: <IconCheck />,
  imei_check_updated: <IconCheck />,
  attachment_added: <IconEnvelope />,
  print_trade_in_agreement: <IconFlag />,
};

const EVENT_ICON_WRAP: Record<string, string> = {
  created: "border-indigo-200 bg-indigo-50 text-indigo-700",
  status_changed: "border-blue-200 bg-blue-50 text-blue-700",
  qa_saved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  imei_check_updated: "border-violet-200 bg-violet-50 text-violet-800",
  attachment_added: "border-amber-200 bg-amber-50 text-amber-900",
  print_trade_in_agreement: "border-slate-200 bg-slate-50 text-slate-800",
};

const EVENT_LABELS: Record<string, string> = {
  created: "创建库存",
  status_changed: "状态变更",
  qa_saved: "质检保存",
  imei_check_updated: "IMEI 对照更新",
  attachment_added: "附件上传",
  print_trade_in_agreement: "打印回收协议",
};

export function InventoryTimeline({ events }: { events: InventoryEventVM[] }) {
  if (events.length === 0) {
    return <div className="py-4 text-sm text-neutral-500">暂无操作记录</div>;
  }

  return (
    <div className="space-y-0">
      {events.map((evt, idx) => (
        <div key={evt.id} className="relative flex gap-3 pb-4">
          {idx < events.length - 1 && (
            <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
          )}
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border [&_svg]:h-3.5 [&_svg]:w-3.5 ${
              EVENT_ICON_WRAP[evt.eventType] ?? "border-border bg-surface-2 text-neutral-600"
            }`}
          >
            {EVENT_ICONS[evt.eventType] ?? <IconPencil className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900">
                {EVENT_LABELS[evt.eventType] ?? evt.eventType}
              </span>
              <span className="text-xs text-neutral-400" title={evt.createdAt}>
                {formatRelativeTime(evt.createdAt)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-neutral-600">{formatPayload(evt.eventType, evt.payload)}</div>
            {evt.operatorName ? (
              <div className="mt-0.5 text-xs text-neutral-400">操作人：{evt.operatorName}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatPayload(type: string, payload: Record<string, unknown>): string {
  if (type === "status_changed") {
    const from = presentInventoryStatus(String(payload.from ?? ""));
    const to = presentInventoryStatus(String(payload.to ?? ""));
    let line = `${from} → ${to}`;
    const soldTo =
      String(payload.to ?? "") === "sold" &&
      (payload[InventoryLinkagePayloadKey.linkageKind] === "buyer_linked" ||
        Boolean(payload[InventoryLinkagePayloadKey.buyerCustomerId]));
    if (soldTo) line = `${line} · 已关联买方客户`;
    return line;
  }
  if (type === "created") {
    const ch = payload.product_channel ? presentInventoryChannel(String(payload.product_channel)) : "";
    const parts = [payload.public_no, ch].filter(Boolean);
    let line = parts.join(" · ");
    const sellerLinked =
      payload[InventoryLinkagePayloadKey.linkageKind] === "seller_linked" ||
      Boolean(payload[InventoryLinkagePayloadKey.sellerCustomerId]);
    if (sellerLinked) line = line ? `${line} · 已关联卖方客户` : "已关联卖方客户";
    return line;
  }
  if (type === "qa_saved") {
    if (payload.qa_completed_at) return "已标记质检完成";
    return "已更新质检数据";
  }
  if (type === "imei_check_updated") {
    return payload.imei_check_done ? "IMEI 对照已完成" : "IMEI 对照未勾选";
  }
  if (type === "attachment_added") {
    const kindRaw = String(payload.kind ?? "");
    const kindLabel =
      (
        {
          id_front: "证件正面",
          id_back: "证件反面",
          invoice: "发票/票据",
          box: "包装附件",
          other: "其他",
        } as Record<string, string>
      )[kindRaw] ?? kindRaw;
    const file = String(payload.file_name ?? "");
    const bits = [kindLabel, file].filter(Boolean);
    return bits.join(" · ") || "已添加附件";
  }
  if (type === "print_trade_in_agreement") {
    const ver = String(payload.legal_template_version ?? "");
    return ver ? `模板版本 ${ver}` : "已记录打印";
  }
  const entries = Object.entries(payload).filter(([, v]) => v != null);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ");
}

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Intl.DateTimeFormat("it-IT", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoStr));
}
