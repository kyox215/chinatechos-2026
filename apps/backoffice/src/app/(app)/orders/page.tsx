import { OrdersSearchControls } from "@/components/orders/OrdersSearchControls";
import { OrderGroupedList } from "@/components/orders/OrderGroupedList";
import { listOrders } from "@/lib/data/orders";

type QueryValue = string | string[] | undefined;

export default async function OrdersPage(props: {
  searchParams?: Promise<Record<string, QueryValue>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const q = normalizeQuery(searchParams.q);
  const status = normalizeQuery(searchParams.status) ?? "all";
  const technician = normalizeQuery(searchParams.technician) ?? "all";
  const paid = normalizePaid(normalizeQuery(searchParams.paid));
  const supplier = normalizeQuery(searchParams.supplier);
  const approvalOverdue = normalizeBool(searchParams.approvalOverdue);
  const pickupOverdue = normalizeBool(searchParams.pickupOverdue);
  const dateFrom = normalizeQuery(searchParams.dateFrom);
  const dateTo = normalizeQuery(searchParams.dateTo);

  const { items, error: listError } = await listOrders({
    q,
    status,
    orderType: "all",
    technician,
    paid,
    supplier,
    approvalOverdue,
    pickupOverdue,
    dateFrom,
    dateTo,
  });
  const today = new Date().toDateString();
  const todayCreated = items.filter((it) => new Date(it.createdAt).toDateString() === today).length;
  const activeOrders = items.filter((it) => !["completed", "cancelled"].includes(it.status)).length;
  const unpaidOrders = items.filter((it) => !it.isPaid).length;

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-neutral-500">工作台 / 工单</div>
          <h1 className="mt-1 text-[2.45rem] font-semibold leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#8b7cf6] to-[#22cfe0]">
            工单
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
            按状态分组查看接单、报价、维修、取件与结算进度。
          </p>
        </div>
        <div className="inline-flex w-fit items-center rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-neutral-700">
          共 <span className="mx-1 tabular-nums text-neutral-950">{items.length}</span> 条
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <StatCard dot="bg-[#8b7cf6]" label="今日新建" value={todayCreated} />
        <StatCard dot="bg-[#22cfe0]" label="进行中" value={activeOrders} />
        <StatCard dot="bg-amber-400" label="未结清" value={unpaidOrders} />
      </div>

      {listError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          列表加载失败：{listError}
        </div>
      ) : null}

      <div className="space-y-3">
        <OrdersSearchControls
          approvalOverdue={approvalOverdue}
          dateFrom={dateFrom}
          dateTo={dateTo}
          paid={paid}
          pickupOverdue={pickupOverdue}
          q={q}
          status={status}
          supplier={supplier}
          technician={technician}
        />

        <OrderGroupedList items={items} />
      </div>
    </div>
  );
}

function StatCard(props: { dot: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/82 px-3 py-3 shadow-[0_8px_22px_rgba(40,89,120,0.10)] backdrop-blur">
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500">
        <span className={`h-2 w-2 rounded-full ${props.dot}`} />
        <span>{props.label}</span>
      </div>
      <div className="mt-1 text-center text-2xl font-semibold leading-none text-neutral-950 tabular-nums">
        {props.value}
      </div>
    </div>
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
