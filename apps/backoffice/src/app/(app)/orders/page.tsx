import type { Metadata } from "next";
import { OrdersListShell } from "@/components/orders/OrdersListShell";
import { listDistinctTechnicianNames, listOrders, listOrderKpiCounts } from "@/lib/data/orders";
import { parseOrderStatusTab } from "@/lib/domain/order-list-tabs";

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
  const tab = parseOrderStatusTab(normalizeQuery(searchParams.tab));
  const status = normalizeQuery(searchParams.status) ?? "all";
  const technician = normalizeQuery(searchParams.technician) ?? "all";
  const paid = normalizePaid(normalizeQuery(searchParams.paid));
  const supplier = normalizeQuery(searchParams.supplier);
  const approvalOverdue = normalizeBool(searchParams.approvalOverdue);
  const pickupOverdue = normalizeBool(searchParams.pickupOverdue);
  const dateFrom = normalizeQuery(searchParams.dateFrom);
  const dateTo = normalizeQuery(searchParams.dateTo);
  const orderType = normalizeOrderType(normalizeQuery(searchParams.orderType));

  const [{ items, error: listError }, technicianOptions, kpiCounts] = await Promise.all([
    listOrders({
      q,
      statusTab: tab,
      status,
      orderType,
      technician,
      paid,
      supplier,
      approvalOverdue,
      pickupOverdue,
      dateFrom,
      dateTo,
    }),
    listDistinctTechnicianNames(),
    listOrderKpiCounts(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <OrdersListShell
        items={items}
        kpiInProgress={kpiCounts.kpiInProgress}
        kpiToday={kpiCounts.kpiToday}
        kpiUnpaid={kpiCounts.kpiUnpaid}
        listError={listError}
        tab={tab}
        technicianOptions={technicianOptions}
      />
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

function normalizeOrderType(value?: string): string {
  if (value === "quick_repair" || value === "dropoff_repair") return value;
  return "all";
}
