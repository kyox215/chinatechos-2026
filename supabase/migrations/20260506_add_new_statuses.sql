-- Add new status values to repair_order_status enum
ALTER TYPE public.repair_order_status ADD VALUE IF NOT EXISTS 'parts_ordered' AFTER 'new';
ALTER TYPE public.repair_order_status ADD VALUE IF NOT EXISTS 'parts_arrived' AFTER 'parts_ordered';
ALTER TYPE public.repair_order_status ADD VALUE IF NOT EXISTS 'repaired' AFTER 'repairing';
ALTER TYPE public.repair_order_status ADD VALUE IF NOT EXISTS 'notified' AFTER 'repaired';
