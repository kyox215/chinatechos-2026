import { getDashboardMetrics } from "@/lib/data/dashboard";
import { listOrders } from "@/lib/data/orders";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const { items } = await listOrders();
  const recent = items.slice(0, 6);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <div className="mt-1 text-sm text-neutral-600">待办驱动的工作台。</div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard title="待确认报价" value={String(metrics.approvalOverdue)} trend="48h" />
        <MetricCard title="超期未取件" value={String(metrics.pickupOverdue)} trend="5天" />
        <MetricCard title="今日新建" value={String(metrics.todayCreated)} trend="Today" />
        <MetricCard title="今日完结" value={String(metrics.todayCompleted)} trend="Today" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="待办列表">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TodoTile title="报价待确认" desc="waiting_approval 超 48h 高亮" />
            <TodoTile title="待取件" desc="waiting_pickup 超 5 天高亮" />
            <TodoTile title="挂起/缺件" desc="pause_reason=缺件 等原因" />
            <TodoTile title="最近更新" desc="按更新时间倒序" />
          </div>
        </Panel>

        <Panel title="最近活动">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[160px_1fr_120px] gap-0 bg-surface-2 px-3 py-2 text-xs font-semibold text-neutral-600">
              <div>工单号</div>
              <div>客户/设备</div>
              <div className="text-right">状态</div>
            </div>
            {recent.length === 0 ? (
              <div className="px-3 py-6 text-sm text-neutral-500">暂无数据（请先配置 Supabase 与导入/录入工单）。</div>
            ) : (
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
                    <StatusPill label={statusLabel(it.status)} tone={statusTone(it.status)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MetricCard(props: { title: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-neutral-700">{props.title}</div>
        <div className="rounded-lg bg-muted px-2 py-1 text-xs text-neutral-600">{props.trend}</div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{props.value}</div>
      <div className="mt-1 text-xs text-neutral-500">占位数据，后续接入接口。</div>
    </div>
  );
}

function Panel(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-neutral-900">{props.title}</div>
        <button className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-muted">
          查看全部
        </button>
      </div>
      {props.children}
    </section>
  );
}

function TodoTile(props: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <div className="text-sm font-semibold text-neutral-900">{props.title}</div>
      <div className="mt-1 text-xs text-neutral-500">{props.desc}</div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-neutral-500">0 条</div>
        <button className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white">
          打开
        </button>
      </div>
    </div>
  );
}

function StatusPill(props: { label: string; tone: "info" | "warn" | "ok" | "danger" }) {
  const tone =
    props.tone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : props.tone === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : props.tone === "danger"
          ? "bg-rose-50 text-rose-700 border-rose-100"
          : "bg-sky-50 text-sky-700 border-sky-100";

  return (
    <span className={["rounded-full border px-2 py-1 text-xs font-semibold", tone].join(" ")}>
      {props.label}
    </span>
  );
}

function statusLabel(status: string) {
  if (status === "waiting_approval") return "待确认";
  if (status === "waiting_pickup") return "待取件";
  if (status === "repairing") return "维修中";
  if (status === "completed") return "已完成";
  if (status === "cancelled") return "已取消";
  if (status === "diagnosing") return "检测中";
  return "新建";
}

function statusTone(status: string): "info" | "warn" | "ok" | "danger" {
  if (status === "completed") return "ok";
  if (status === "cancelled") return "danger";
  if (status === "waiting_approval" || status === "waiting_pickup") return "warn";
  return "info";
}
