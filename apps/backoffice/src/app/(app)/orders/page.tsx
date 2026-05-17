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

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-neutral-500">维修流程</div>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-neutral-950">工单</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
            按状态分组查看接单、报价、维修、取件与结算进度。
          </p>
        </div>
        <div className="inline-flex w-fit items-center rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-neutral-700">
          共 <span className="mx-1 tabular-nums text-neutral-950">{items.length}</span> 条
        </div>
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
