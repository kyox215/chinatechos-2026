import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { getCustomerDetail, getCustomerDevices, getCustomerOrders } from "@/lib/data/customer-detail";
import { buildWhatsAppLink } from "@/lib/domain/whatsapp";

export default async function CustomerDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const customer = await getCustomerDetail(id);
  if (!customer) notFound();

  const [devices, orders] = await Promise.all([
    getCustomerDevices(id),
    getCustomerOrders(id),
  ]);

  const totalSpend = orders.reduce((sum, o) => sum + (o.quotationAmount ?? 0), 0);
  const activeOrders = orders.filter((o) =>
    !["completed", "cancelled"].includes(o.status),
  );

  const waLink = buildWhatsAppLink(
    customer.phoneE164,
    `Buongiorno ${customer.name ?? "Cliente"}, la contatto da ChinaTech Roma.`,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-muted"
          >
            ← 返回列表
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {customer.name ?? "未命名客户"}
            </h1>
            <div className="mt-0.5 text-sm text-neutral-600">{customer.phoneE164}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white leading-9 hover:bg-emerald-600"
          >
            WhatsApp
          </a>
          <Link
            href={`/orders?q=${encodeURIComponent(customer.phoneE164)}`}
            className="h-9 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-neutral-700 leading-9 hover:bg-muted"
          >
            查看全部工单
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard title="总工单" value={String(orders.length)} />
        <StatCard title="进行中" value={String(activeOrders.length)} />
        <StatCard title="总消费" value={formatEUR(totalSpend)} />
        <StatCard title="注册时间" value={formatDate(customer.createdAt)} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Left: Customer info + devices */}
        <div className="space-y-4">
          {/* Basic info */}
          <Card title="基本信息">
            <Row label="姓名" value={customer.name ?? "-"} />
            <Row label="电话 (E.164)" value={customer.phoneE164} />
            <Row label="电话 (原始)" value={customer.phoneRaw ?? "-"} />
            <Row label="通知许可" value={customer.consentRequiredNotify ? "✓ 是" : "✗ 否"} />
            <Row label="营销许可" value={customer.consentMarketing ? "✓ 是" : "✗ 否"} />
            {customer.notes && <Row label="备注" value={customer.notes} />}
          </Card>

          {/* Devices */}
          <Card title={`设备 (${devices.length})`}>
            {devices.length === 0 ? (
              <div className="py-3 text-sm text-neutral-500">暂无设备记录</div>
            ) : (
              <div className="space-y-2">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-border bg-surface-2 p-3"
                  >
                    <div className="text-sm font-medium text-neutral-900">
                      {d.brand} {d.model}
                    </div>
                    {d.serialOrImei && (
                      <div className="mt-0.5 text-xs text-neutral-500">
                        IMEI/SN: {d.serialOrImei}
                      </div>
                    )}
                    <div className="mt-0.5 text-xs text-neutral-400">
                      添加: {formatDate(d.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Orders */}
        <div className="space-y-4">
          <Card title={`历史工单 (${orders.length})`}>
            {orders.length === 0 ? (
              <div className="py-3 text-sm text-neutral-500">暂无工单记录</div>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="block rounded-xl border border-border bg-surface-2 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-neutral-900">
                        {o.publicNo}
                      </div>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <div className="mt-1 text-xs text-neutral-600">
                      {[o.deviceBrand, o.deviceModel].filter(Boolean).join(" ")}
                      {o.issueDescription ? ` · ${o.issueDescription}` : ""}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                      <span>{formatDate(o.createdAt)}</span>
                      <span className="font-medium text-neutral-900">
                        {o.quotationAmount != null ? formatEUR(o.quotationAmount) : "-"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{props.title}</h2>
      {props.children}
    </section>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1.5 text-sm">
      <span className="text-neutral-500">{props.label}</span>
      <span className="text-neutral-900">{props.value}</span>
    </div>
  );
}

function StatCard(props: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="text-xs text-neutral-500">{props.title}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{props.value}</div>
    </div>
  );
}

function formatEUR(value: number) {
  if (value === 0) return "€0";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
