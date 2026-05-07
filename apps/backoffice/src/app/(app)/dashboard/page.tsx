import Link from "next/link";
import type { ReactNode } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { getDashboardMetrics } from "@/lib/data/dashboard";
import { listOrders } from "@/lib/data/orders";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const { items, error: ordersListError } = await listOrders();
  const recent = items.slice(0, 6);

  return (
    <div className="space-y-4 md:space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <div className="mt-1 text-sm text-neutral-600">待办驱动的工作台。</div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <MetricCard title="待客户确认报价" value={String(metrics.approvalOverdue)} trend="48h" />
        <MetricCard title="超期未取件" value={String(metrics.pickupOverdue)} trend="5天" />
        <MetricCard title="今日新建" value={String(metrics.todayCreated)} trend="Today" />
        <MetricCard title="今日完结" value={String(metrics.todayCompleted)} trend="Today" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="待办列表" actionHref="/orders">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TodoTile title="报价待确认" desc="waiting_approval 超 48h 高亮" count={metrics.approvalOverdue} href="/orders?approvalOverdue=1" />
            <TodoTile title="待取件 / 待付款" desc="waiting_pickup 超 5 天高亮" count={metrics.pickupOverdue} href="/orders?pickupOverdue=1" />
            <TodoTile title="今日新建工单" desc="按创建时间汇总，支持继续分派处理" count={metrics.todayCreated} href="/orders" />
            <TodoTile title="今日完结工单" desc="按完结状态汇总，便于交接复盘" count={metrics.todayCompleted} href="/orders?status=completed" />
          </div>
        </Panel>

        <Panel title="快捷入口">
          <div className="grid grid-cols-1 gap-3">
            <QuickEntry title="新建工单" desc="从列表顶部创建新的维修工单" href="/orders" />
            <QuickEntry title="打开工单列表" desc="进入工单列表继续处理待办" href="/orders" />
            <QuickEntry title="打开客户列表" desc="按手机号快速检索客户与历史" href="/customers" />
          </div>
        </Panel>
      </div>

      <Panel title="最近活动" actionHref="/orders">
          {ordersListError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900">
              最近工单加载失败：{ordersListError}
            </div>
          ) : null}
          <div className="space-y-3 md:hidden">
            {!ordersListError && recent.length === 0 ? (
              <div className="rounded-xl border border-border px-3 py-6 text-sm text-neutral-500">
                暂无数据（请先配置 Supabase 与导入/录入工单）。
              </div>
            ) : null}
            {!ordersListError && recent.length > 0
              ? recent.map((it) => (
                  <article key={it.id} className="rounded-xl border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-neutral-900">{it.publicNo}</div>
                      <OrderStatusBadge status={it.status} />
                    </div>
                    <div className="mt-2 text-sm text-neutral-900">
                      {(it.customerName ?? "未命名客户") + (it.deviceLabel ? ` · ${it.deviceLabel}` : "")}
                    </div>
                    <div className="mt-1 line-clamp-1 text-xs text-neutral-500">
                      {it.issue}
                      {it.technicianName ? ` · ${it.technicianName}` : ""}
                    </div>
                  </article>
                ))
              : null}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <div className="grid grid-cols-[160px_1fr_120px] gap-0 bg-surface-2 px-3 py-2 text-xs font-semibold text-neutral-600">
              <div>工单号</div>
              <div>客户/设备</div>
              <div className="text-right">状态</div>
            </div>
            {!ordersListError && recent.length === 0 ? (
              <div className="px-3 py-6 text-sm text-neutral-500">暂无数据（请先配置 Supabase 与导入/录入工单）。</div>
            ) : null}
            {!ordersListError && recent.length > 0 ? (
              recent.map((it) => (
                <div
                  key={it.id}
                  className="grid grid-cols-[160px_1fr_120px] items-center gap-0 border-t border-border px-3 py-2"
                >
                  <div className="text-sm font-medium text-neutral-900">{it.publicNo}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-neutral-900">
                      {(it.customerName ?? "未命名客户") + (it.deviceLabel ? ` · ${it.deviceLabel}` : "")}
                    </div>
                    <div className="truncate text-xs text-neutral-500">
                      {it.issue}
                      {it.technicianName ? ` · ${it.technicianName}` : ""}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <OrderStatusBadge status={it.status} />
                  </div>
                </div>
              ))
            ) : null}
          </div>
      </Panel>
    </div>
  );
}

function MetricCard(props: { title: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 md:p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-neutral-700 md:text-sm">{props.title}</div>
        <div className="rounded-lg bg-muted px-2 py-1 text-xs text-neutral-600">{props.trend}</div>
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight md:mt-3 md:text-2xl">{props.value}</div>
      <div className="mt-1 text-xs text-neutral-500">按当前门店统计。</div>
    </div>
  );
}

function Panel(props: { title: string; children: ReactNode; actionHref?: string }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-neutral-900">{props.title}</div>
        {props.actionHref ? (
          <Link
            href={props.actionHref}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-muted"
          >
            查看全部
          </Link>
        ) : null}
      </div>
      {props.children}
    </section>
  );
}

function TodoTile(props: { title: string; desc: string; count: number; href: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3 md:p-4">
      <div className="text-sm font-semibold text-neutral-900">{props.title}</div>
      <div className="mt-1 text-xs text-neutral-500">{props.desc}</div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-neutral-500">{props.count} 条</div>
        <Link
          href={props.href}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
        >
          打开
        </Link>
      </div>
    </div>
  );
}

function QuickEntry(props: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={props.href}
      className="block rounded-2xl border border-border bg-surface-2 p-3 transition-colors hover:bg-muted md:p-4"
    >
      <div className="text-sm font-semibold text-neutral-900">{props.title}</div>
      <div className="mt-1 text-xs text-neutral-500">{props.desc}</div>
    </Link>
  );
}
