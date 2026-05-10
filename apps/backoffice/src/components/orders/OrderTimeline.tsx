import type { ReactNode } from "react";
import type { OrderEvent } from "@/lib/data/order-detail";
import {
  IconPlus, IconArrowPath, IconCheck, IconXMark,
  IconPencil, IconEnvelope, IconFlag, IconTruck, IconMoney,
} from "@/components/icons";
import { getOrderStatusPresentation } from "@/lib/order-status";

const EVENT_ICONS: Record<string, ReactNode> = {
  created: <IconPlus />,
  status_changed: <IconArrowPath />,
  quote_sent: <IconEnvelope />,
  approval_marked: <IconCheck />,
  payment_updated: <IconMoney className="h-3.5 w-3.5" />,
  delivered: <IconTruck />,
  completed: <IconFlag />,
  cancelled: <IconXMark />,
  message_opened: <IconEnvelope />,
  message_marked_sent: <IconEnvelope />,
  fields_updated: <IconPencil />,
};

const EVENT_ICON_WRAP: Record<string, string> = {
  created: "border-border bg-status-progress text-status-progress-foreground",
  status_changed: "border-border bg-status-info text-status-info-foreground",
  quote_sent: "border-border bg-status-progress text-status-progress-foreground",
  approval_marked: "border-border bg-status-success text-status-success-foreground",
  payment_updated: "border-border bg-status-warn text-status-warn-foreground",
  delivered: "border-border bg-status-success text-status-success-foreground",
  completed: "border-border bg-status-success text-status-success-foreground",
  cancelled: "border-border bg-status-danger text-status-danger-foreground",
  message_opened: "border-border bg-status-neutral text-status-neutral-foreground",
  message_marked_sent: "border-border bg-status-neutral text-status-neutral-foreground",
  fields_updated: "border-border bg-status-warn text-status-warn-foreground",
};

const EVENT_LABELS: Record<string, string> = {
  created: "工单创建",
  status_changed: "状态变更",
  quote_sent: "报价发送",
  approval_marked: "审批结果",
  payment_updated: "付款更新",
  delivered: "交付客户",
  completed: "工单完成",
  cancelled: "工单取消",
  message_opened: "消息已打开",
  message_marked_sent: "消息已发送",
  fields_updated: "信息修改",
};

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) {
    return <div className="py-4 text-sm text-muted-foreground">暂无事件记录</div>;
  }

  return (
    <div className="space-y-0">
      {events.map((evt, idx) => (
        <div key={evt.id} className="relative flex gap-3 pb-4">
          {/* Vertical line */}
          {idx < events.length - 1 && (
            <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
          )}
          {/* Icon */}
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border [&_svg]:h-3.5 [&_svg]:w-3.5 ${
              EVENT_ICON_WRAP[evt.eventType] ?? "border-border bg-surface-2 text-muted-foreground"
            }`}
          >
            {EVENT_ICONS[evt.eventType] ?? <span className="h-2 w-2 rounded-full bg-muted-foreground" />}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {EVENT_LABELS[evt.eventType] ?? evt.eventType}
              </span>
              <span
                className="text-xs text-muted-foreground"
                title={formatAbsoluteTime(evt.createdAt)}
              >
                {formatRelativeTime(evt.createdAt)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {formatPayload(evt.eventType, evt.payload)}
            </div>
            {evt.operatorName && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                操作人：{evt.operatorName}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatPayload(type: string, payload: Record<string, unknown>): string {
  if (type === "status_changed") {
    const from = String(payload.fromStatus ?? "");
    const to = String(payload.toStatus ?? "");
    const fromLabel = getOrderStatusPresentation(from).label;
    const toLabel = getOrderStatusPresentation(to).label;
    let text = `${fromLabel} → ${toLabel}`;
    if (payload.cancelReason) text += ` (原因: ${payload.cancelReason})`;
    return text;
  }
  if (type === "created") {
    const parts = [payload.brand, payload.model, payload.customerPhone].filter(Boolean);
    return parts.join(" · ");
  }
  if (type === "payment_updated") {
    return `押金 ${payload.deposit ?? "-"} / 余额 ${payload.balance ?? "-"} / ${payload.isPaid ? "已结清" : "未结清"}`;
  }
  if (type === "approval_marked") {
    const map: Record<string, string> = { approved: "客户同意", rejected: "客户拒绝", pending: "待确认" };
    return map[String(payload.result)] ?? String(payload.result);
  }
  if (type === "fields_updated") {
    const fields = payload.fields;
    if (Array.isArray(fields)) return `更新字段: ${fields.join(", ")}`;
  }
  if (type === "delivered") {
    return `交付时间: ${payload.deliveredAt ?? "-"}`;
  }
  const entries = Object.entries(payload).filter(([, v]) => v != null);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
}

function formatAbsoluteTime(isoStr: string): string {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(isoStr));
  } catch {
    return isoStr;
  }
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
  return new Intl.DateTimeFormat("it-IT", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(isoStr));
}
