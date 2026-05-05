import { listOrders } from "@/lib/data/orders";

export default async function OrdersPage() {
  const { items } = await listOrders();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">工单</h1>
          <div className="mt-1 text-sm text-neutral-600">高频操作优先：先搜索，再筛选。</div>
        </div>
        <button className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-white">
          新建工单
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[420px] max-w-full">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
              <span className="text-xs">⌕</span>
            </div>
            <input
              className="h-9 w-full rounded-xl border border-border bg-surface-2 pl-8 pr-3 text-sm outline-none focus:border-primary/40 focus:shadow-[0_0_0_4px_var(--color-ring)]"
              placeholder="电话 / 工单号 / IMEI / 品牌型号 / 技师 / 关键词"
            />
          </div>

          <FilterPill label="状态" value="全部" />
          <FilterPill label="类型" value="全部" />
          <FilterPill label="结清" value="全部" />
          <FilterPill label="待确认超时" value="否" tone="warn" />
          <FilterPill label="超期未取件" value="否" tone="warn" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[140px_220px_1fr_140px_120px_120px] gap-0 bg-surface-2 px-3 py-2 text-xs font-semibold text-neutral-600">
            <div>状态</div>
            <div>工单号</div>
            <div>客户 / 设备 / 问题</div>
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
                className="grid grid-cols-[140px_220px_1fr_140px_120px_120px] items-center gap-0 border-t border-border px-3 py-2"
              >
                <div>
                  <StatusPill label={statusLabel(it.status)} tone={statusTone(it.status)} />
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
                <div className="text-sm font-semibold text-neutral-900">{formatEUR(it.total)}</div>
                <div className="text-sm text-neutral-700">{it.technicianName ?? "-"}</div>
                <div className="flex justify-end gap-2">
                  <button className="h-8 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-neutral-700 hover:bg-muted">
                    详情
                  </button>
                  <button className="h-8 rounded-xl bg-primary px-3 text-xs font-semibold text-white">
                    WhatsApp
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPill(props: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  const tone =
    props.tone === "warn" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-muted text-neutral-700 border-border";

  return (
    <button className={["h-9 rounded-xl border px-3 text-sm font-medium", tone].join(" ")}>
      <span className="text-neutral-500">{props.label}</span> {props.value}
    </button>
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
    <span className={["inline-flex rounded-full border px-2 py-1 text-xs font-semibold", tone].join(" ")}>
      {props.label}
    </span>
  );
}

function formatEUR(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
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
