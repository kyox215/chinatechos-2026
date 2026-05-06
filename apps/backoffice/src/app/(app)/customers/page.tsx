import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { listCustomers } from "@/lib/data/customer-list";

type QueryValue = string | string[] | undefined;

export default async function CustomersPage(props: {
  searchParams?: Promise<Record<string, QueryValue>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const q = normalizeQuery(searchParams.q);
  const filter = normalizeQuery(searchParams.filter) ?? "all";

  const { items } = await listCustomers({
    q,
    hasActiveOrder: filter === "active",
    hasRecentOrder: filter === "recent",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">客户</h1>
          <div className="mt-1 text-sm text-neutral-600">
            按手机号快速定位客户与历史工单。共 {items.length} 位客户。
          </div>
        </div>
        <Link
          href="/customers/new"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white leading-10 sm:h-9 sm:leading-9"
        >
          新建客户
        </Link>
      </div>

      <CustomerSearch q={q ?? ""} filter={filter} />

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {items.length === 0 ? (
          <div className="rounded-xl border border-border px-3 py-8 text-sm text-neutral-500">
            暂无客户数据。
          </div>
        ) : (
          items.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="block rounded-xl border border-border bg-surface-2 p-3 transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-neutral-900">
                  {c.name ?? "未命名客户"}
                </div>
                {c.hasActiveOrder && (
                  <span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                    有进行中工单
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-neutral-600">{c.phoneE164}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-neutral-500">
                <div>工单数：{c.totalOrders}</div>
                <div>消费：{formatEUR(c.totalSpend)}</div>
                <div>最近：{c.lastOrderAt ? formatDate(c.lastOrderAt) : "-"}</div>
              </div>
              {c.lastOrderStatus && (
                <div className="mt-2">
                  <OrderStatusBadge status={c.lastOrderStatus} />
                </div>
              )}
            </Link>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border lg:block">
        <div className="grid grid-cols-[1fr_160px_100px_120px_140px_100px] gap-0 bg-surface-2 px-3 py-2 text-xs font-semibold text-neutral-600">
          <div>客户</div>
          <div>电话</div>
          <div>工单数</div>
          <div>总消费</div>
          <div>最近工单</div>
          <div>状态</div>
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-8 text-sm text-neutral-500">暂无客户数据。</div>
        ) : (
          items.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="grid grid-cols-[1fr_160px_100px_120px_140px_100px] items-center gap-0 border-t border-border px-3 py-2 transition-colors hover:bg-muted"
            >
              <div>
                <div className="text-sm font-medium text-neutral-900">
                  {c.name ?? "未命名客户"}
                </div>
              </div>
              <div className="text-sm text-neutral-700">{c.phoneE164}</div>
              <div className="text-sm text-neutral-700">{c.totalOrders}</div>
              <div className="text-sm font-medium text-neutral-900">{formatEUR(c.totalSpend)}</div>
              <div className="text-sm text-neutral-700">
                {c.lastOrderAt ? formatDate(c.lastOrderAt) : "-"}
              </div>
              <div>
                {c.lastOrderStatus ? (
                  <OrderStatusBadge status={c.lastOrderStatus} />
                ) : (
                  <span className="text-xs text-neutral-400">-</span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function formatEUR(value: number) {
  if (value === 0) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function normalizeQuery(value: QueryValue): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
