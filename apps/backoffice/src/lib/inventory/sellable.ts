export type InventorySellableInput = {
  product_channel: string;
  lifecycle_status: string;
  listing_hold_until: string | null;
  imei_check_done: boolean;
  qa_completed_at: string | null;
};

/** Single source for whether an item may move to reserved/sold. */
export function canSellInventory(row: InventorySellableInput, now: Date = new Date()): boolean {
  if (row.lifecycle_status !== "in_stock") return false;
  if (row.listing_hold_until && new Date(row.listing_hold_until) > now) return false;
  if (row.product_channel === "trade_in") {
    if (!row.imei_check_done) return false;
    if (!row.qa_completed_at) return false;
  }
  return true;
}
