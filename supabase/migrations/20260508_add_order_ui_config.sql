alter table public.stores
  add column if not exists order_ui_config jsonb;
