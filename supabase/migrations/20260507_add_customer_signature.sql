alter table public.repair_orders
  add column if not exists customer_signature text;
