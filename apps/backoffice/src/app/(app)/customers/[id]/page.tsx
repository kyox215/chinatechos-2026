import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { CustomerInfoCard } from "@/components/customers/CustomerInfoCard";
import { DeviceCard } from "@/components/customers/DeviceCard";
import { CustomerActions } from "@/components/customers/CustomerActions";
import { getCustomerDetail, getCustomerDevices, getCustomerOrders } from "@/lib/data/customer-detail";

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
        <CustomerActions
          customerId={id}
          customerPhone={customer.phoneE164}
          customerName={customer.name}
        />
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
          <CustomerInfoCard
            id={customer.id}
            name={customer.name}
            phoneE164={customer.phoneE164}
            phoneRaw={customer.phoneRaw}
            consentRequiredNotify={customer.consentRequiredNotify}
            consentMarketing={customer.consentMarketing}
            notes={customer.notes}
          />
          <DeviceCard customerId={id} devices={devices} />
        </div>

        {/* Right: Orders */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">历史工单 ({orders.length})</h2>
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
                      <div className="text-sm font-medium text-neutral-900">{o.publicNo}</div>
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
          </section>
        </div>
      </div>
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
