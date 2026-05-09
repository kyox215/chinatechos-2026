/**
 * Structured payloads for inventory_events — enables customer linkage observability and downstream parsing.
 * Existing event_type strings stay stable (`created`, `status_changed`, …).
 */

export const InventoryLinkagePayloadKey = {
  storeId: "store_id",
  inventoryItemId: "inventory_item_id",
  sellerCustomerId: "seller_customer_id",
  buyerCustomerId: "buyer_customer_id",
  linkageKind: "linkage_kind",
} as const;

export type InventoryLinkageKind = "seller_linked" | "buyer_linked";

export function buildInventoryCreatedPayload(input: {
  storeId: string;
  inventoryItemId: string;
  publicNo: string;
  productChannel: string;
  sellerCustomerId: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    [InventoryLinkagePayloadKey.storeId]: input.storeId,
    [InventoryLinkagePayloadKey.inventoryItemId]: input.inventoryItemId,
    public_no: input.publicNo,
    product_channel: input.productChannel,
  };
  if (input.sellerCustomerId) {
    payload[InventoryLinkagePayloadKey.sellerCustomerId] = input.sellerCustomerId;
    payload[InventoryLinkagePayloadKey.linkageKind] = "seller_linked" satisfies InventoryLinkageKind;
  }
  return payload;
}

export function buildInventoryStatusChangedPayload(input: {
  storeId: string;
  inventoryItemId: string;
  from: string;
  to: string;
  buyerCustomerId?: string | null;
  soldPrice?: number | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    [InventoryLinkagePayloadKey.storeId]: input.storeId,
    [InventoryLinkagePayloadKey.inventoryItemId]: input.inventoryItemId,
    from: input.from,
    to: input.to,
  };
  if (input.to === "sold") {
    if (input.soldPrice !== undefined && input.soldPrice !== null) {
      payload.sold_price = input.soldPrice;
    }
    if (input.buyerCustomerId) {
      payload[InventoryLinkagePayloadKey.buyerCustomerId] = input.buyerCustomerId;
      payload[InventoryLinkagePayloadKey.linkageKind] = "buyer_linked" satisfies InventoryLinkageKind;
    }
  }
  return payload;
}
