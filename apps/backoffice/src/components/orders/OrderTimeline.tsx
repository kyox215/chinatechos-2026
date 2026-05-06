import type { ReactNode } from "react";
import type { OrderEvent } from "@/lib/data/order-detail";
import {
  IconPlus, IconArrowPath, IconCheck, IconXMark,
  IconPencil, IconEnvelope, IconFlag, IconTruck, IconMoney,
} from "@/components/icons";

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
    return <div className="py-4 text-sm text-neutral-500">暂无事件记录</div>;
  }

  return (
    <div className="space-y-0">
      {events.map((evt, idx) => (
        <div key={evt.id} className="relative flex gap-3 pb-4">
          {/* Vertical line */}
          {idx < events.length - 1 && (
            <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
          )}
          {/* Icon */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center text-neutral-500">
            {EVENT_ICONS[evt.eventType] ?? <span className="h-2 w-2 rounded-full bg-neutral-400" />}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900">
                {EVENT_LABELS[evt.eventType] ?? evt.eventType}
              </span>
              <span className="text-xs text-neutral-400">
                {formatRelativeTime(evt.createdAt)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-neutral-600">
              {formatPayload(evt.eventType, evt.payload)}
            </div>
            {evt.operatorName && (
              <div className="mt-0.5 text-xs text-neutral-400">
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
    let text = `${from} → ${to}`;
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
