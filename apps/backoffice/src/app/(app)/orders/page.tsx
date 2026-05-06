import { OrdersSearchControls } from "@/components/orders/OrdersSearchControls";
import { OrderTransitionButton } from "@/components/OrderTransitionButton";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { listOrders } from "@/lib/data/orders";

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
                  <button className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-neutral-700 hover:bg-muted">
                    详情
                  </button>
                  <button className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-white">
                    WhatsApp
                  </button>
                  <OrderActions it={it} />
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border lg:block">
          <div className="grid grid-cols-[140px_220px_1fr_120px_140px_120px_220px] gap-0 bg-surface-2 px-3 py-2 text-xs font-semibold text-neutral-600">
            <div>状态</div>
            <div>工单号</div>
            <div>客户 / 设备 / 问题</div>
            <div>创建时间</div>
            <div>金额</div>
            <div>技师</div>
            <div className="text-right">操作</div>
          </div>

          {items.length === 0 ? (
            <div className="px-3 py-8 text-sm text-neutral-500">
              暂无工单数据（请先配置 Supabase 并写入 repair_orders）。
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="grid grid-cols-[140px_220px_1fr_120px_140px_120px_220px] items-center gap-0 border-t border-border px-3 py-2"
              >
                <div>
                  <OrderStatusBadge status={it.status} />
                </div>
                <div className="text-sm font-medium text-neutral-900">{it.publicNo}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm text-neutral-900">
                    {(it.customerName ?? "未命名客户") +
                      (it.deviceLabel ? ` · ${it.deviceLabel}` : "") +
                      (it.issue ? ` · ${it.issue}` : "")}
                  </div>
                  <div className="truncate text-xs text-neutral-500">
                    {it.customerPhone}
                    {it.technicianName ? ` · ${it.technicianName}` : ""}
                  </div>
                </div>
                <div className="text-sm text-neutral-700">{formatDate(it.createdAt)}</div>
                <div className="text-sm font-semibold text-neutral-900">{formatEUR(it.total)}</div>
                <div className="text-sm text-neutral-700">{it.technicianName ?? "-"}</div>
                <div className="flex justify-end gap-2">
                  <button className="h-8 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-neutral-700 hover:bg-muted">
                    详情
                  </button>
                  <button className="h-8 rounded-xl bg-primary px-3 text-xs font-semibold text-white">
                    WhatsApp
                  </button>
                  <OrderActions it={it} />
                </div>
              </div>
            ))
          )}
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
  };
}) {
  if (props.it.status === "repairing") {
    return (
      <OrderTransitionButton
        confirmText={`确认将工单 ${props.it.publicNo} 标记为待取件/待付款吗？`}
        label="标记完工"
        orderId={props.it.id}
        toStatus="waiting_pickup"
      />
    );
  }

  if (props.it.status === "waiting_approval") {
    return (
      <div className="flex flex-wrap gap-2">
        <OrderTransitionButton
          confirmText={`确认将工单 ${props.it.publicNo} 标记为客户已同意并进入维修中吗？`}
          label="同意维修"
          orderId={props.it.id}
          toStatus="repairing"
        />
        <OrderTransitionButton
          confirmText={`确认将工单 ${props.it.publicNo} 标记为已取消吗？`}
          label="拒绝报价"
          orderId={props.it.id}
          reasonField="cancelReason"
          reasonPrompt="请输入拒绝原因（将写入取消原因）"
          toStatus="cancelled"
        />
      </div>
    );
  }

  return null;
}

function formatEUR(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { month: "2-digit", day: "2-digit" }).format(
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
