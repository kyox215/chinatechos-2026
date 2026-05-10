import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { CustomerPagination } from "@/components/customers/CustomerPagination";
import { listCustomers } from "@/lib/data/customer-list";

export const metadata: Metadata = {
  title: "客户 — ChinaTechOS",
  description: "客户列表管理，按手机号快速定位客户与历史工单",
};

type QueryValue = string | string[] | undefined;

export default async function CustomersPage(props: {
  searchParams?: Promise<Record<string, QueryValue>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const q = normalizeQuery(searchParams.q);
  const filter = normalizeQuery(searchParams.filter) ?? "all";
  const page = normalizeInt(searchParams.page, 1);

  const { items, totalCount, pageSize } = await listCustomers({
    q,
    hasActiveOrder: filter === "active",
    hasRecentOrder: filter === "recent",
    page,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">客户</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            按手机号快速定位客户与历史工单。共 <span className="font-mono tabular-nums">{totalCount}</span> 位客户。
          </div>
        </div>
        <Link
          href="/customers/new"
          className="h-10 rounded-xl px-4 text-sm font-semibold text-primary-foreground leading-10 sm:h-9 sm:leading-9"
          style={{ background: "var(--gradient-brand)" }}
        >
          新建客户
        </Link>
      </div>

      <CustomerSearch q={q ?? ""} filter={filter} />

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {items.length === 0 ? (
          <div className="rounded-xl border border-border px-3 py-8 text-sm text-muted-foreground">
            暂无客户数据。
          </div>
        ) : (
          items.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="glass-card block rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">
                  {c.name ?? "未命名客户"}
                </div>
                {c.hasActiveOrder && (
                  <span className="rounded-lg border border-border bg-status-warn/10 px-2 py-0.5 text-xs text-status-warn-foreground">
                    有进行中工单
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{c.phoneE164}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>工单数：<span className="font-mono tabular-nums">{c.totalOrders}</span></div>
                <div>消费：<span className="font-mono tabular-nums">{formatEUR(c.totalSpend)}</span></div>
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
      <div className="glass-card hidden overflow-hidden rounded-xl border border-border lg:block">
        <div className="grid grid-cols-[1fr_160px_100px_120px_140px_100px] gap-0 bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground">
          <div>客户</div>
          <div>电话</div>
          <div>工单数</div>
          <div>总消费</div>
          <div>最近工单</div>
          <div>状态</div>
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-8 text-sm text-muted-foreground">暂无客户数据。</div>
        ) : (
          items.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="grid grid-cols-[1fr_160px_100px_120px_140px_100px] items-center gap-0 border-t border-border px-3 py-2 transition-colors hover:bg-accent"
            >
              <div>
                <div className="text-sm font-medium text-foreground">
                  {c.name ?? "未命名客户"}
                </div>
              </div>
              <div className="text-sm text-foreground">{c.phoneE164}</div>
              <div className="text-sm font-mono tabular-nums text-foreground">{c.totalOrders}</div>
              <div className="text-sm font-medium font-mono tabular-nums text-foreground">{formatEUR(c.totalSpend)}</div>
              <div className="text-sm text-foreground">
                {c.lastOrderAt ? formatDate(c.lastOrderAt) : "-"}
              </div>
              <div>
                {c.lastOrderStatus ? (
                  <OrderStatusBadge status={c.lastOrderStatus} />
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <CustomerPagination page={page} totalPages={totalPages} />
      )}
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

function normalizeInt(value: QueryValue, fallback: number): number {
  const s = normalizeQuery(value);
  if (!s) return fallback;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}
