import { notFound } from "next/navigation";
import { InventoryDetailClient, type InventoryDetailVm } from "@/components/inventory/InventoryDetailClient";
import type { InventoryEventVM } from "@/components/inventory/InventoryTimeline";
import { canSellInventory } from "@/lib/inventory/sellable";
import { getInventoryItem, listInventoryEvents } from "@/lib/data/inventory";
import { getCustomerDetail } from "@/lib/data/customer-detail";

export default async function InventoryDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const item = await getInventoryItem(id);
  if (!item) notFound();

  const eventsRaw = await listInventoryEvents(id);
  const events: InventoryEventVM[] = eventsRaw.map((e) => ({
    id: e.id as string,
    eventType: e.event_type as string,
    payload: (e.payload as Record<string, unknown>) ?? {},
    operatorName: (e.operator_name as string | null) ?? null,
    createdAt: e.created_at as string,
  }));

  let sellerLabel: string | null = null;
  if (item.seller_customer_id) {
    const c = await getCustomerDetail(item.seller_customer_id);
    if (c) sellerLabel = [c.name, c.phoneE164].filter(Boolean).join(" · ");
  }
  let buyerLabel: string | null = null;
  if (item.buyer_customer_id) {
    const c = await getCustomerDetail(item.buyer_customer_id);
    if (c) buyerLabel = [c.name, c.phoneE164].filter(Boolean).join(" · ");
  }

  const vm: InventoryDetailVm = {
    id: item.id,
    public_no: item.public_no,
    product_channel: item.product_channel,
    lifecycle_status: item.lifecycle_status,
    brand: item.brand,
    model: item.model,
    imei_or_serial: item.imei_or_serial,
    purchase_cost: item.purchase_cost,
    list_price: item.list_price,
    sold_price: item.sold_price,
    qa_report: item.qa_report as Record<string, unknown>,
    qa_completed_at: item.qa_completed_at,
    listing_hold_until: item.listing_hold_until,
    imei_check_done: item.imei_check_done,
    imei_check_note: item.imei_check_note,
    notes: item.notes,
    sellerLabel,
    buyerLabel,
  };

  const canSell = canSellInventory(item);

  return <InventoryDetailClient canSell={canSell} events={events} item={vm} />;
}
