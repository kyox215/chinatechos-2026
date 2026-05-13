import Link from "next/link";
import type { ReactNode } from "react";
import { StatusPopover } from "@/components/orders/StatusPopover";
import {
  getOrderTodoMessage,
  getOrderTypeBadge,
} from "@/lib/domain/order-detail-actions";

type Props = {
  orderId: string;
  publicNo: string;
  status: string;
  orderType: string;
  isRework: boolean;
  customerName: string | null;
  customerPhone: string | null;
  /** 主操作槽：通常为 OrderDetailPrint；可叠加其他次级按钮 */
  primaryActions: ReactNode;
};

/**
 * 工单详情顶部摘要条：
 * - 返回入口、`public_no`、工单类型、状态切换；
 * - 客户姓名 / 电话；
 * - 「下一步」提示横条，文案由状态机派生（[lib/domain/order-detail-actions.ts](../../../lib/domain/order-detail-actions.ts)）；
 * - 主操作槽位（打印 / 关键 CTA）。
 *
 * 仅做布局组合：状态切换继续走 `StatusPopover`，不重复实现按钮逻辑。
 */
export function OrderDetailSummaryBar(props: Props) {
  const typeBadge = props.isRework
    ? getOrderTypeBadge("rework")
    : getOrderTypeBadge(props.orderType);
  const todo = getOrderTodoMessage(props.status);
  const phoneHref = telHref(props.customerPhone);

  return (
    <div className="order-detail-section order-detail-enter-d0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/orders"
          className="ui-btn ui-btn-secondary inline-flex h-9 items-center gap-1 px-3 text-xs"
        >
          <span aria-hidden>←</span>
          <span>返回列表</span>
        </Link>
        {props.primaryActions ? (
          <div className="flex flex-wrap items-center gap-2">{props.primaryActions}</div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border border-l-[3px] border-l-primary bg-surface p-3 shadow-sm md:p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 md:text-xl">
            {props.publicNo}
          </h1>
          {typeBadge ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${typeBadge.className}`}
              title={typeBadge.labelIt}
            >
              {typeBadge.label}
            </span>
          ) : null}
          <StatusPopover orderId={props.orderId} status={props.status} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium text-neutral-800">
            {props.customerName?.trim() || "未命名客户"}
          </span>
          <span aria-hidden className="text-neutral-300">·</span>
          {phoneHref ? (
            <a
              className="font-medium tabular-nums text-neutral-700 underline-offset-2 hover:underline"
              href={phoneHref}
            >
              {props.customerPhone}
            </a>
          ) : (
            <span className="tabular-nums text-neutral-600">
              {props.customerPhone ?? "-"}
            </span>
          )}
        </div>

        {todo ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/15 bg-surface/70 px-3 py-2 text-xs text-neutral-700">
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              下一步
            </span>
            <span className="min-w-0 flex-1 leading-snug">{todo}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function telHref(phone: string | null | undefined): string | null {
  const raw = phone?.trim();
  if (!raw || raw === "-") return null;
  const normalized = raw.replace(/\s/g, "");
  if (!/^\+?[0-9]{8,}$/.test(normalized)) return null;
  return `tel:${normalized}`;
}
