import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { CreateReworkButton } from "@/components/orders/CreateReworkButton";
import { DeliverButton } from "@/components/orders/DeliverButton";
import { FinanceCard } from "@/components/orders/FinanceCard";
import { NotifyCustomerButton } from "@/components/orders/NotifyCustomerButton";
import { OrderInfoCard } from "@/components/orders/OrderInfoCard";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { ReworkInfoBanner } from "@/components/orders/ReworkInfoBanner";
import { StatusPopover } from "@/components/orders/StatusPopover";
import { OrderDetailPrint } from "@/components/orders/OrderDetailPrint";
import { SignatureSection } from "@/components/orders/SignatureSection";
import { WhatsAppButton } from "@/components/orders/WhatsAppButton";
import { getOrderDetail, getOrderEvents, listLinkedReworkOrders } from "@/lib/data/order-detail";
import { getStoreSettings } from "@/lib/data/store-settings";

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const events = await getOrderEvents(id);
  const linkedReworkOrders =
    order.status === "completed" ? await listLinkedReworkOrders(id) : [];
  const storeSettings = await getStoreSettings();
  const defaultPrintOptions = storeSettings
    ? {
        paperSize: storeSettings.printPaper,
        orientation: storeSettings.printOrientation,
        density: storeSettings.printDensity,
        marginMm: storeSettings.printMarginMm,
      }
    : undefined;

  const isTerminal = false;
  const showSignature = ["repaired", "notified", "unfixed_pickup", "completed", "rework"].includes(order.status);

  const showCancelBanner = order.status === "cancelled" && Boolean(order.cancelReason);
  const showPauseBanner = Boolean(order.pauseReason);
  const hasBanner = showCancelBanner || showPauseBanner;

  const gridAnim = hasBanner ? "order-detail-enter-d2" : "order-detail-enter-d1";
  const timelineAnim = hasBanner ? "order-detail-enter-d3" : "order-detail-enter-d2";

  return (
    <div className="order-detail-page space-y-4">
      {/* Header */}
      <div className="order-detail-section order-detail-enter-d0 space-y-3">
        <Link
          href="/orders"
          className="inline-flex rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-muted"
        >
          ← 返回列表
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 rounded-xl border border-primary/15 border-l-[3px] border-l-primary bg-primary-2/35 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{order.publicNo}</h1>
              <StatusPopover orderId={order.id} status={order.status} />
              <OrderDetailPrint
                balanceAmount={order.balanceAmount}
                brand={order.device?.brand ?? "—"}
                customerName={order.customer?.name ?? null}
                customerPhone={order.customer?.phoneE164 ?? "—"}
                customerSignature={order.customerSignature}
                depositAmount={order.depositAmount}
                diagnosisResult={order.diagnosisResult}
                faultPrices={order.faultPrices}
                internalTag={order.internalTag}
                issueDescription={order.issueDescription}
                model={order.device?.model ?? "—"}
                publicNo={order.publicNo}
                quotationAmount={order.quotationAmount}
                serialOrImei={order.device?.serialOrImei ?? null}
                technicianName={order.technicianName}
                warrantyText={order.warrantyText}
                defaultPrintOptions={defaultPrintOptions}
                isRework={!!order.originalOrderId}
                originalPublicNo={order.originalOrder?.publicNo}
                originalCompletedAt={order.originalOrder?.completedAt}
                originalWarrantyText={order.originalOrder?.warrantyText}
              />
            </div>
            <div className="mt-2 text-sm">
              <span className="font-medium text-neutral-800">{order.customer?.name ?? "未命名客户"}</span>
              <span className="text-neutral-400"> · </span>
              <span className="text-neutral-600">{order.customer?.phoneE164 ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rework info banner */}
      {order.originalOrderId && order.originalOrder && (
        <ReworkInfoBanner
          originalOrderId={order.originalOrderId}
          originalPublicNo={order.originalOrder.publicNo}
          originalCompletedAt={order.originalOrder.completedAt}
          originalWarrantyText={order.originalOrder.warrantyText}
        />
      )}

      {/* Banners */}
      {hasBanner ? (
        <div className={`order-detail-section order-detail-enter-d1 space-y-4`}>
          {showCancelBanner ? (
            <div className="rounded-xl border border-rose-200/90 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
              取消原因：{order.cancelReason}
            </div>
          ) : null}
          {showPauseBanner ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
              暂停原因：{order.pauseReason}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Body */}
      <div className={`grid grid-cols-1 gap-4 xl:grid-cols-2 ${gridAnim} order-detail-section`}>
        {/* Left column - Order Info */}
        <OrderInfoCard
          orderId={order.id}
          isEditable={!isTerminal}
          customer={order.customer}
          device={order.device}
          supplier={order.supplier}
          issueDescription={order.issueDescription}
          quotationAmount={order.quotationAmount}
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
            faultPrices={order.faultPrices}
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
                {(order.status === "notified" || order.status === "unfixed_pickup") && (
                  <DeliverButton orderId={order.id} deliveredAt={order.deliveredAt} />
                )}
                {order.customer?.phoneE164 && (
                  <WhatsAppButton
                    orderId={order.id}
                    customerPhone={order.customer.phoneE164}
                    contactPhones={order.contactPhones}
                    status={order.status}
                    customerName={order.customer.name}
                    deviceLabel={[order.device?.brand, order.device?.model].filter(Boolean).join(" ")}
                    issueDescription={order.issueDescription}
                    quotationAmount={order.quotationAmount}
                  />
                )}
                {order.status === "completed" && order.customer?.phoneE164 && (
                  <CreateReworkButton
                    orderId={order.id}
                    customerPhone={order.customer.phoneE164}
                    customerName={order.customer.name}
                    brand={order.device?.brand ?? ""}
                    model={order.device?.model ?? ""}
                    serialOrImei={order.device?.serialOrImei ?? null}
                    warrantyText={order.warrantyText}
                  />
                )}
              </div>
            </section>
          )}

          {/* Signature */}
          {showSignature && (
            <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">Firma cliente</h2>
              <SignatureSection orderId={order.id} customerSignature={order.customerSignature} />
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

      {linkedReworkOrders.length > 0 && (
        <section className="order-detail-section rounded-2xl border border-border bg-surface p-3 md:p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">关联返修单</h2>
          <ul className="space-y-2 text-sm">
            {linkedReworkOrders.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/orders/${row.id}`} className="font-medium text-indigo-600 hover:underline">
                  {row.publicNo}
                </Link>
                <OrderStatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Timeline */}
      <section className={`rounded-2xl border border-border bg-surface p-3 md:p-4 ${timelineAnim} order-detail-section`}>
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
      <span className="tabular-nums text-neutral-900">{formatDateTime(value)}</span>
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
