import type { Metadata } from "next";
import { OrdersSearchControls } from "@/components/orders/OrdersSearchControls";
import { OrderGroupedList } from "@/components/orders/OrderGroupedList";
import { listOrders } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: "工单 — ChinaTechOS",
  description: "管理和筛选所有工单",
};

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
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-xl font-semibold tracking-tight">工单</h1>
        <span className="text-sm text-muted-foreground">
          共 <span className="font-mono tabular-nums">{items.length}</span> 条
        </span>
      </div>

      {listError ? (
        <div className="rounded-xl border border-border bg-status-danger/10 px-3 py-2 text-sm text-status-danger-foreground">
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
