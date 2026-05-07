-- 未修待取件：独立状态，用于列表分组与流转
ALTER TYPE public.repair_order_status ADD VALUE IF NOT EXISTS 'unfixed_pickup' AFTER 'notified';
