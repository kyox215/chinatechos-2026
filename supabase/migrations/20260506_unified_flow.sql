-- Unified flow: add 'quoted' status, create suppliers table, add supplier_id to repair_orders
-- Migrate legacy statuses: repairing → repaired, waiting_pickup → notified

-- 1. Add 'quoted' enum value
ALTER TYPE public.repair_order_status ADD VALUE IF NOT EXISTS 'quoted' AFTER 'diagnosing';

-- 2. Migrate legacy data (run after enum is committed)
UPDATE public.repair_orders SET status = 'repaired' WHERE status = 'repairing';
UPDATE public.repair_orders SET status = 'notified' WHERE status = 'waiting_pickup';

-- 3. Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  contact text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_store_access" ON public.suppliers
  FOR ALL USING (true);

-- 4. Add supplier_id to repair_orders
ALTER TABLE public.repair_orders
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
