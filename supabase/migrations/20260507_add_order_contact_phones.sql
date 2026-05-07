alter table public.repair_orders
  add column if not exists contact_phones text[] not null default '{}';
