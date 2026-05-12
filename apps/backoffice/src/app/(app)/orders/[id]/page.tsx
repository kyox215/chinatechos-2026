import type { Metadata } from "next";
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
import { OrderDetailHero } from "@/components/orders/OrderDetailHero";
import { OrderDetailPrint } from "@/components/orders/OrderDetailPrint";
import { SignatureSection } from "@/components/orders/SignatureSection";
import { WhatsAppButton } from "@/components/orders/WhatsAppButton";
import { getOrderDetail, getOrderEvents, listLinkedReworkOrders } from "@/lib/data/order-detail";
import { getStoreSettings } from "@/lib/data/store-settings";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const order = await getOrderDetail(id);
  return {
    title: order ? `${order.publicNo} — ChinaTechOS` : "工单详情 — ChinaTechOS",
    description: order ? `工单 ${order.publicNo} 的详细信息` : "查看工单详细信息",
  };
}

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

  const deviceLabel = [order.device?.brand, order.device?.model].filter(Boolean).join(" ");
  const subtitle = `${deviceLabel || "—"} · ${order.customer?.name ?? "未命名客户"} · 技师 ${order.technicianName ?? "—"}`;

  return (
    <div className="order-detail-page mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <div className="order-detail-section order-detail-enter-d0">
        <OrderDetailHero
          backLink={
            <Link
              className="inline-flex rounded-lg border border-border bg-surface px-2 py-1 text-foreground transition-colors hover:bg-accent"
              href="/orders"
            >
              ← 返回列表
            </Link>
          }
          badgeRow={
            <>
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
            </>
          }
          publicNo={order.publicNo}
          quotationAmount={order.quotationAmount}
          subtitle={subtitle}
        />
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
            <div className="rounded-xl border border-border bg-status-danger/10 px-4 py-3 text-sm text-status-danger-foreground shadow-sm">
              取消原因：{order.cancelReason}
            </div>
          ) : null}
          {showPauseBanner ? (
            <div className="rounded-xl border border-border bg-status-warn/10 px-4 py-3 text-sm text-status-warn-foreground shadow-sm">
              暂停原因：{order.pauseReason}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Body */}
      <div className={`grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] ${gridAnim} order-detail-section`}>
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
            <section className="glass-card rounded-2xl border border-border bg-surface p-3 md:p-4">
              <h2 className="font-display mb-3 text-sm font-semibold text-foreground">操作</h2>
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
            <section className="glass-card rounded-2xl border border-border bg-surface p-3 md:p-4">
              <h2 className="font-display mb-3 text-sm font-semibold text-foreground">Firma cliente</h2>
              <SignatureSection orderId={order.id} customerSignature={order.customerSignature} />
            </section>
          )}

          {/* Dates */}
          <section className="glass-card rounded-2xl border border-border bg-surface p-3 md:p-4">
            <h2 className="font-display mb-3 text-sm font-semibold text-foreground">时间节点</h2>
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
        <section className="glass-card order-detail-section rounded-2xl border border-border bg-surface p-3 md:p-4">
          <h2 className="font-display mb-3 text-sm font-semibold text-foreground">关联返修单</h2>
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

      {/* Timeline */}
      <section className={`glass-card rounded-2xl border border-border bg-surface p-3 md:p-4 ${timelineAnim} order-detail-section`}>
        <h2 className="font-display mb-3 text-sm font-semibold text-foreground">操作时间线</h2>
        <OrderTimeline events={events} />
      </section>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-foreground">{formatDateTime(value)}</span>
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
