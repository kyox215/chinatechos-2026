import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliverButton } from "@/components/orders/DeliverButton";
import { FinanceCard } from "@/components/orders/FinanceCard";
import { NotifyCustomerButton } from "@/components/orders/NotifyCustomerButton";
import { OrderInfoCard } from "@/components/orders/OrderInfoCard";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { StatusPopover } from "@/components/orders/StatusPopover";
import { OrderDetailPrint } from "@/components/orders/OrderDetailPrint";
import { WhatsAppButton } from "@/components/orders/WhatsAppButton";
import { getOrderDetail, getOrderEvents } from "@/lib/data/order-detail";

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const events = await getOrderEvents(id);

  const isTerminal = order.status === "completed" || order.status === "cancelled";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/orders"
          className="inline-flex rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-muted"
        >
          ← 返回列表
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{order.publicNo}</h1>
              <StatusPopover orderId={order.id} status={order.status} />
              <OrderDetailPrint
                balanceAmount={order.balanceAmount}
                brand={order.device?.brand ?? "—"}
                customerName={order.customer?.name ?? null}
                customerPhone={order.customer?.phoneE164 ?? "—"}
                depositAmount={order.depositAmount}
                diagnosisResult={order.diagnosisResult}
                internalTag={order.internalTag}
                issueDescription={order.issueDescription}
                model={order.device?.model ?? "—"}
                publicNo={order.publicNo}
                quotationAmount={order.quotationAmount}
                serialOrImei={order.device?.serialOrImei ?? null}
                technicianName={order.technicianName}
                warrantyText={order.warrantyText}
              />
            </div>
            <div className="mt-1 text-sm text-neutral-600">
              {order.customer?.name ?? "未命名客户"} · {order.customer?.phoneE164 ?? "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Banners */}
      {order.status === "cancelled" && order.cancelReason && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          取消原因：{order.cancelReason}
        </div>
      )}
      {order.pauseReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          暂停原因：{order.pauseReason}
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Left column - Order Info */}
        <OrderInfoCard
          orderId={order.id}
          isEditable={!isTerminal}
          customer={order.customer}
          device={order.device}
          supplier={order.supplier}
          issueDescription={order.issueDescription}
          diagnosisResult={order.diagnosisResult}
          technicianName={order.technicianName}
          internalTag={order.internalTag}
          warrantyText={order.warrantyText}
          pauseReason={order.pauseReason}
        />

        {/* Right column */}
        <div className="space-y-4">
          {/* Finance */}
          <FinanceCard
            orderId={order.id}
            issueDescription={order.issueDescription}
            quotationAmount={order.quotationAmount}
            depositAmount={order.depositAmount}
            balanceAmount={order.balanceAmount}
            isPaid={order.isPaid}
            isEditable={!isTerminal}
            customerPhone={order.customer?.phoneE164 ?? null}
            customerName={order.customer?.name ?? null}
            deviceLabel={[order.device?.brand, order.device?.model].filter(Boolean).join(" ")}
          />

          {/* Actions */}
          {!isTerminal && (
            <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">操作</h2>
              <div className="flex flex-wrap gap-2">
                {(order.status === "repaired" || order.status === "parts_arrived") && order.customer?.phoneE164 && (
                  <NotifyCustomerButton
                    orderId={order.id}
                    status={order.status}
                    customerPhone={order.customer.phoneE164}
                    customerName={order.customer.name}
                    deviceLabel={[order.device?.brand, order.device?.model].filter(Boolean).join(" ")}
                  />
                )}
                {order.status === "notified" && (
                  <DeliverButton orderId={order.id} deliveredAt={order.deliveredAt} />
                )}
                {order.customer?.phoneE164 && (
                  <WhatsAppButton
                    orderId={order.id}
                    customerPhone={order.customer.phoneE164}
                    status={order.status}
                    customerName={order.customer.name}
                    deviceLabel={[order.device?.brand, order.device?.model].filter(Boolean).join(" ")}
                    issueDescription={order.issueDescription}
                    quotationAmount={order.quotationAmount}
                  />
                )}
              </div>
            </section>
          )}

          {/* Dates */}
          <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">时间节点</h2>
            <div className="space-y-1">
              <DateRow label="创建" value={order.createdAt} />
              {order.approvalSentAt && <DateRow label="报价发送" value={order.approvalSentAt} />}
              {order.approvalConfirmedAt && <DateRow label="客户确认" value={order.approvalConfirmedAt} />}
              {order.completedAt && <DateRow label="完工" value={order.completedAt} />}
              {order.deliveredAt && <DateRow label="交付" value={order.deliveredAt} />}
              <DateRow label="更新" value={order.updatedAt} />
            </div>
          </section>
        </div>
      </div>

      {/* Timeline */}
      <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">操作时间线</h2>
        <OrderTimeline events={events} />
      </section>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-900">{formatDateTime(value)}</span>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
