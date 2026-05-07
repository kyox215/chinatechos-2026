-- Add original_order_id to link rework orders to their original order
ALTER TABLE repair_orders
  ADD COLUMN IF NOT EXISTS original_order_id uuid REFERENCES repair_orders(id);

CREATE INDEX IF NOT EXISTS idx_repair_orders_original
  ON repair_orders(original_order_id) WHERE original_order_id IS NOT NULL;
