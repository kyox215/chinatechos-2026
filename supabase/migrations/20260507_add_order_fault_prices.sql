alter table public.repair_orders
  add column if not exists fault_prices jsonb not null default '{}'::jsonb;
