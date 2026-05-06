import Link from "next/link";
import { OrdersSearchControls } from "@/components/orders/OrdersSearchControls";
import { OrderTransitionButton } from "@/components/OrderTransitionButton";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderGroupedList } from "@/components/orders/OrderGroupedList";
import { listOrders } from "@/lib/data/orders";
import { getNextActions } from "@/lib/domain/order-status";

type QueryValue = string | string[] | undefined;

export default async function OrdersPage(props: {
  searchParams?: Promise<Record<string, QueryValue>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const q = normalizeQuery(searchParams.q);
  const status = normalizeQuery(searchParams.status) ?? "all";
  const orderType = normalizeQuery(searchParams.orderType) ?? "all";
  const technician = normalizeQuery(searchParams.technician) ?? "all";
  const paid = normalizePaid(normalizeQuery(searchParams.paid));
  const approvalOverdue = normalizeBool(searchParams.approvalOverdue);
  const pickupOverdue = normalizeBool(searchParams.pickupOverdue);
  const dateFrom = normalizeQuery(searchParams.dateFrom);
  const dateTo = normalizeQuery(searchParams.dateTo);

  const { items } = await listOrders({
    q,
    status,
    orderType,
    technician,
    paid,
    approvalOverdue,
    pickupOverdue,
    dateFrom,
    dateTo,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">工单</h1>
          <div className="mt-1 text-sm text-neutral-600">高频操作优先：先搜索，再筛选。</div>
        </div>
      </div>

      <div className="space-y-3">
        <OrdersSearchControls
          approvalOverdue={approvalOverdue}
          dateFrom={dateFrom}
          dateTo={dateTo}
          orderType={orderType}
          paid={paid}
          pickupOverdue={pickupOverdue}
          q={q}
          status={status}
          technician={technician}
        />

        <div className="space-y-3 lg:hidden">
          {items.length === 0 ? (
            <div className="rounded-xl border border-border px-3 py-8 text-sm text-neutral-500">
              暂无工单数据（请先配置 Supabase 并写入 repair_orders）。
            </div>
          ) : (
            items.map((it) => (
              <article key={it.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-3">
                  <OrderStatusBadge status={it.status} />
                  <div className="text-sm font-semibold text-neutral-900">{it.publicNo}</div>
                </div>
                <div className="mt-2 text-sm text-neutral-900">
                  {(it.customerName ?? "未命名客户") + (it.deviceLabel ? ` · ${it.deviceLabel}` : "")}
                </div>
                <div className="mt-1 text-xs text-neutral-600">{it.issue || "未填写问题描述"}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-600">
                  <div>电话：{it.customerPhone || "-"}</div>
                  <div>技师：{it.technicianName ?? "-"}</div>
                  <div>创建：{formatDate(it.createdAt)}</div>
                  <div className="font-semibold text-neutral-900">金额：{formatEUR(it.total)}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-neutral-700 hover:bg-muted leading-9"
                    href={`/orders/${it.id}`}
                  >
                    详情
                  </Link>
                  <OrderActions it={it} />
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden lg:block">
          <OrderGroupedList items={items} />
        </div>
      </div>
    </div>
  );
}

function OrderActions(props: {
  it: {
    id: string;
    publicNo: string;
    status: string;
    orderType: string;
  };
}) {
  const actions = getNextActions(props.it.status, props.it.orderType);
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <OrderTransitionButton
          key={action.toStatus}
          confirmText={action.confirmText}
          label={action.label}
          orderId={props.it.id}
          toStatus={action.toStatus}
          variant={action.variant}
          {...(action.toStatus === "cancelled"
            ? { reasonField: "cancelReason", reasonPrompt: "请输入取消原因" }
            : {})}
        />
      ))}
    </div>
  );
}

function formatEUR(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}

function normalizeQuery(value: QueryValue): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function normalizePaid(value?: string): "all" | "yes" | "no" {
  if (value === "yes" || value === "no") return value;
  return "all";
}

function normalizeBool(value: QueryValue) {
  const normalized = normalizeQuery(value);
  return normalized === "1" || normalized === "true";
}
