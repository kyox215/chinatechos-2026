import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderTransitionButton } from "@/components/OrderTransitionButton";
import { DeliverButton } from "@/components/orders/DeliverButton";
import { OrderEditButton } from "@/components/orders/OrderEditButton";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { PaymentCard } from "@/components/orders/PaymentCard";
import { WhatsAppButton } from "@/components/orders/WhatsAppButton";
import { getOrderDetail, getOrderEvents } from "@/lib/data/order-detail";
import { getNextActions } from "@/lib/domain/order-status";

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const events = await getOrderEvents(id);
  const actions = getNextActions(order.status, order.orderType);

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
              <OrderStatusBadge status={order.status} />
              <span className="rounded-lg border border-border bg-muted px-2 py-0.5 text-xs text-neutral-600">
                {order.orderType === "quick_repair" ? "快速维修" : "留机维修"}
              </span>
            </div>
            <div className="mt-1 text-sm text-neutral-600">
              {order.customer?.name ?? "未命名客户"} · {order.customer?.phoneE164 ?? "-"}
            </div>
          </div>

          {!isTerminal && actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <OrderTransitionButton
                  key={action.toStatus}
                  confirmText={action.confirmText}
                  label={action.label}
                  orderId={order.id}
                  toStatus={action.toStatus}
                  variant={action.variant}
                  {...(action.toStatus === "cancelled"
                    ? { reasonField: "cancelReason", reasonPrompt: "请输入取消原因" }
                    : {})}
                />
              ))}
            </div>
          )}
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
        {/* Left column */}
        <div className="space-y-4">
          {/* Customer */}
          <DetailCard title="客户信息">
            <div className="flex items-start justify-between py-1.5 text-sm">
              <span className="text-neutral-500">姓名</span>
              {order.customer ? (
                <Link href={`/customers/${order.customer.id}`} className="text-indigo-600 hover:underline">
                  {order.customer.name ?? "未命名客户"}
                </Link>
              ) : (
                <span className="text-neutral-900">-</span>
              )}
            </div>
            <DetailRow label="电话" value={order.customer?.phoneE164 ?? "-"} />
          </DetailCard>

          {/* Device */}
          <DetailCard title="设备信息">
            <DetailRow label="品牌" value={order.device?.brand ?? "-"} />
            <DetailRow label="型号" value={order.device?.model ?? "-"} />
            <DetailRow label="IMEI/SN" value={order.device?.serialOrImei ?? "-"} />
          </DetailCard>

          {/* Repair */}
          <DetailCard title="维修信息">
            <DetailRow label="问题描述" value={order.issueDescription} />
            <DetailRow label="诊断结果" value={order.diagnosisResult ?? "-"} />
            <DetailRow label="技师" value={order.technicianName ?? "-"} />
            <DetailRow label="报价" value={order.quotationAmount != null ? `€${order.quotationAmount}` : "-"} />
            <DetailRow label="标签" value={order.internalTag ?? "-"} />
            <DetailRow label="保修" value={order.warrantyText ?? "-"} />
            {order.pauseReason && <DetailRow label="暂停原因" value={order.pauseReason} highlight />}
            {!isTerminal && (
              <div className="mt-3 border-t border-border pt-3">
                <OrderEditButton
                  orderId={order.id}
                  issueDescription={order.issueDescription}
                  diagnosisResult={order.diagnosisResult}
                  technicianName={order.technicianName}
                  quotationAmount={order.quotationAmount}
                  depositAmount={order.depositAmount}
                  internalTag={order.internalTag}
                  warrantyText={order.warrantyText}
                  pauseReason={order.pauseReason}
                />
              </div>
            )}
          </DetailCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Payment */}
          <PaymentCard
            orderId={order.id}
            quotationAmount={order.quotationAmount}
            depositAmount={order.depositAmount}
            balanceAmount={order.balanceAmount}
            isPaid={order.isPaid}
            isEditable={!isTerminal}
          />

          {/* Delivery */}
          {order.status === "waiting_pickup" && (
            <DetailCard title="交付">
              <DeliverButton orderId={order.id} deliveredAt={order.deliveredAt} />
            </DetailCard>
          )}

          {/* WhatsApp */}
          {order.customer?.phoneE164 && (
            <DetailCard title="消息">
              <WhatsAppButton orderId={order.id} customerPhone={order.customer.phoneE164} />
            </DetailCard>
          )}

          {/* Dates */}
          <DetailCard title="时间节点">
            <DetailRow label="创建" value={formatDateTime(order.createdAt)} />
            {order.approvalSentAt && (
              <DetailRow label="报价发送" value={formatDateTime(order.approvalSentAt)} />
            )}
            {order.approvalConfirmedAt && (
              <DetailRow label="客户确认" value={formatDateTime(order.approvalConfirmedAt)} />
            )}
            {order.completedAt && (
              <DetailRow label="完工" value={formatDateTime(order.completedAt)} />
            )}
            {order.deliveredAt && (
              <DetailRow label="交付" value={formatDateTime(order.deliveredAt)} />
            )}
            <DetailRow label="更新" value={formatDateTime(order.updatedAt)} />
          </DetailCard>

          {/* Approval status */}
          {order.orderType === "dropoff_repair" && (
            <DetailCard title="审批状态">
              <DetailRow
                label="状态"
                value={
                  order.approvalStatus === "approved"
                    ? "已批准"
                    : order.approvalStatus === "rejected"
                      ? "已拒绝"
                      : "待确认"
                }
              />
            </DetailCard>
          )}
        </div>
      </div>

      {/* Timeline */}
      <DetailCard title="操作时间线">
        <OrderTimeline events={events} />
      </DetailCard>
    </div>
  );
}

function DetailCard(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{props.title}</h2>
      {props.children}
    </section>
  );
}

function DetailRow(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5 text-sm">
      <span className="text-neutral-500">{props.label}</span>
      <span className={props.highlight ? "font-medium text-rose-600" : "text-neutral-900"}>
        {props.value}
      </span>
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

