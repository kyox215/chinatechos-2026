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

  const { items } = await listOrders({
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
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">工单</h1>
        <span className="text-sm text-neutral-500">共 {items.length} 条</span>
      </div>

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
