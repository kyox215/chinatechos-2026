-- 寄修流程：列表分组「寄修」专用状态
ALTER TYPE public.repair_order_status ADD VALUE IF NOT EXISTS 'mail_in_progress' AFTER 'new';
