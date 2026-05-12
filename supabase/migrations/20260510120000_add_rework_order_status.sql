-- Rework lane: application uses status 'rework' but enum lacked the value (writes failed silently in UI).
ALTER TYPE public.repair_order_status ADD VALUE IF NOT EXISTS 'rework' AFTER 'new';
