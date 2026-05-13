import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { CreateReworkButton } from "@/components/orders/CreateReworkButton";
import { DeliverButton } from "@/components/orders/DeliverButton";
import { FinanceCard } from "@/components/orders/FinanceCard";
import { NotifyCustomerButton } from "@/components/orders/NotifyCustomerButton";
import { OrderDetailSummaryBar } from "@/components/orders/OrderDetailSummaryBar";
import { OrderInfoCard } from "@/components/orders/OrderInfoCard";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { ReworkInfoBanner } from "@/components/orders/ReworkInfoBanner";
import { OrderDetailPrint } from "@/components/orders/OrderDetailPrint";
import { SignatureSection } from "@/components/orders/SignatureSection";
import { WhatsAppButton } from "@/components/orders/WhatsAppButton";
import { getOrderDetail, getOrderEvents, listLinkedReworkOrders } from "@/lib/data/order-detail";
import { getStoreSettings } from "@/lib/data/store-settings";
import { TERMINAL_STATUSES } from "@/lib/domain/order-status";

const SIGNATURE_STATUSES = new Set([
  "repaired",
  "notified",
  "unfixed_pickup",
  "completed",
  "rework",
]);

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

  const isTerminal = TERMINAL_STATUSES.has(order.status);
  const isEditable = !isTerminal;
  const showSignature = SIGNATURE_STATUSES.has(order.status);
  const deviceLabel = [order.device?.brand, order.device?.model].filter(Boolean).join(" ");

  const showCancelBanner = order.status === "cancelled" && Boolean(order.cancelReason);
  const showPauseBanner = Boolean(order.pauseReason);
  const hasBanner = showCancelBanner || showPauseBanner;

  const gridAnim = hasBanner ? "order-detail-enter-d2" : "order-detail-enter-d1";
  const timelineAnim = hasBanner ? "order-detail-enter-d3" : "order-detail-enter-d2";

  const canNotifyCustomer =
    (order.status === "repaired" || order.status === "parts_arrived") &&
    Boolean(order.customer?.phoneE164);
  const canDeliver = order.status === "notified" || order.status === "unfixed_pickup";
  const canCreateRework = order.status === "completed" && Boolean(order.customer?.phoneE164);
  const hasCustomerActions =
    canNotifyCustomer || canDeliver || canCreateRework || Boolean(order.customer?.phoneE164);

  const printButton = (
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
  );

  return (
    <div className="order-detail-page space-y-4">
      <OrderDetailSummaryBar
        orderId={order.id}
        publicNo={order.publicNo}
        status={order.status}
        orderType={order.orderType}
        isRework={!!order.originalOrderId}
        customerName={order.customer?.name ?? null}
        customerPhone={order.customer?.phoneE164 ?? null}
        primaryActions={printButton}
      />

      {order.originalOrderId && order.originalOrder && (
        <ReworkInfoBanner
          originalOrderId={order.originalOrderId}
          originalPublicNo={order.originalOrder.publicNo}
          originalCompletedAt={order.originalOrder.completedAt}
          originalWarrantyText={order.originalOrder.warrantyText}
        />
      )}

      {hasBanner ? (
        <div className="order-detail-section order-detail-enter-d1 space-y-3">
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

      <div className={`grid grid-cols-1 gap-4 xl:grid-cols-2 ${gridAnim} order-detail-section`}>
        <OrderInfoCard
          orderId={order.id}
          isEditable={isEditable}
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

        <div className="space-y-4">
          <FinanceCard
            orderId={order.id}
            issueDescription={order.issueDescription}
            faultPrices={order.faultPrices}
            quotationAmount={order.quotationAmount}
            depositAmount={order.depositAmount}
            balanceAmount={order.balanceAmount}
            isPaid={order.isPaid}
            isEditable={isEditable}
            customerPhone={order.customer?.phoneE164 ?? null}
            customerName={order.customer?.name ?? null}
            deviceLabel={deviceLabel}
          />

          {hasCustomerActions && (
            <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">客户沟通与交付</h2>
              <div className="flex flex-wrap items-start gap-2">
                {canNotifyCustomer && order.customer?.phoneE164 && (
                  <NotifyCustomerButton
                    orderId={order.id}
                    status={order.status}
                    customerPhone={order.customer.phoneE164}
                    customerName={order.customer.name}
                    deviceLabel={deviceLabel}
                  />
                )}
                {order.customer?.phoneE164 && (
                  <WhatsAppButton
                    orderId={order.id}
                    customerPhone={order.customer.phoneE164}
                    contactPhones={order.contactPhones}
                    status={order.status}
                    customerName={order.customer.name}
                    deviceLabel={deviceLabel}
                    issueDescription={order.issueDescription}
                    quotationAmount={order.quotationAmount}
                  />
                )}
                {canDeliver && (
                  <DeliverButton orderId={order.id} deliveredAt={order.deliveredAt} />
                )}
                {canCreateRework && order.customer?.phoneE164 && (
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

          {showSignature && (
            <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">客户签名</h2>
              <SignatureSection orderId={order.id} customerSignature={order.customerSignature} />
            </section>
          )}

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
                <Link href={`/orders/${row.id}`} className="font-medium text-primary hover:underline">
                  {row.publicNo}
                </Link>
                <OrderStatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

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
