-- Inventory / trade-in MVP tables

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  public_no text not null,
  product_channel text not null check (product_channel in ('new_retail', 'refurbished', 'trade_in')),
  lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft', 'in_stock', 'reserved', 'sold', 'cancelled')),
  brand text not null,
  model text not null,
  imei_or_serial text,
  purchase_cost numeric(12, 2),
  list_price numeric(12, 2),
  sold_price numeric(12, 2),
  seller_customer_id uuid references public.customers(id) on delete set null,
  buyer_customer_id uuid references public.customers(id) on delete set null,
  source_repair_order_id uuid references public.repair_orders(id) on delete set null,
  qa_report jsonb not null default '{}'::jsonb,
  qa_completed_at timestamptz,
  listing_hold_until timestamptz,
  imei_check_done boolean not null default false,
  imei_check_note text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, public_no)
);

create index if not exists inventory_items_store_status_idx on public.inventory_items(store_id, lifecycle_status);
create index if not exists inventory_items_store_created_idx on public.inventory_items(store_id, created_at desc);
create index if not exists inventory_items_store_imei_idx on public.inventory_items(store_id, imei_or_serial);

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  operator_name text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_events_item_idx on public.inventory_events(inventory_item_id, created_at desc);

alter table public.inventory_items enable row level security;
alter table public.inventory_events enable row level security;

drop policy if exists "inventory_items_read" on public.inventory_items;
create policy "inventory_items_read" on public.inventory_items
for select
using (deleted_at is null and store_id = public.current_store_id());

drop policy if exists "inventory_events_read" on public.inventory_events;
create policy "inventory_events_read" on public.inventory_events
for select
using (store_id = public.current_store_id());
