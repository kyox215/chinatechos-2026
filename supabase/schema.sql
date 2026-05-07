create extension if not exists "pgcrypto";

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  store_code text not null unique,
  name text not null,
  timezone text not null default 'Europe/Rome',
  approval_overdue_hours int not null default 48,
  pickup_overdue_days int not null default 5,
  order_ui_config jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text,
  phone_raw text,
  phone_e164 text not null,
  consent_required_notify boolean not null default true,
  consent_marketing boolean not null default false,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active row per store + E.164 phone (soft-deleted rows excluded).
create unique index if not exists customers_store_phone_active_unique on public.customers(store_id, phone_e164)
  where deleted_at is null;
create index if not exists customers_store_name_idx on public.customers(store_id, name);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  brand text not null,
  model text not null,
  serial_or_imei text,
  device_notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists devices_store_customer_idx on public.devices(store_id, customer_id);
create index if not exists devices_store_imei_idx on public.devices(store_id, serial_or_imei);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'repair_order_type') then
    create type public.repair_order_type as enum ('quick_repair', 'dropoff_repair');
  end if;
  if not exists (select 1 from pg_type where typname = 'repair_order_status') then
    create type public.repair_order_status as enum (
      'new',
      'diagnosing',
      'quoted',
      'waiting_approval',
      'parts_ordered',
      'parts_arrived',
      'repairing',
      'repaired',
      'notified',
      'unfixed_pickup',
      'waiting_pickup',
      'completed',
      'cancelled'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type public.approval_status as enum ('pending', 'approved', 'rejected');
  end if;
end$$;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  short_name text not null,
  color text not null default 'blue',
  contact text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.repair_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  public_no text not null,
  order_type public.repair_order_type not null,
  status public.repair_order_status not null default 'new',
  status_raw text,
  customer_id uuid not null references public.customers(id) on delete restrict,
  device_id uuid references public.devices(id) on delete set null,
  issue_description text not null,
  diagnosis_result text,
  quotation_amount numeric(12,2),
  deposit_amount numeric(12,2),
  balance_amount numeric(12,2),
  is_paid boolean not null default false,
  approval_status public.approval_status not null default 'pending',
  approval_sent_at timestamptz,
  approval_confirmed_at timestamptz,
  technician_name text,
  internal_tag text,
  warranty_text text,
  completed_at timestamptz,
  delivered_at timestamptz,
  pause_reason text,
  cancel_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  unique (store_id, public_no)
);

create index if not exists repair_orders_store_status_idx on public.repair_orders(store_id, status);
create index if not exists repair_orders_store_created_idx on public.repair_orders(store_id, created_at desc);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  code text not null,
  type text not null,
  language text not null default 'IT',
  body text not null,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, code)
);

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  order_id uuid references public.repair_orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  template_code text,
  message_body text not null,
  status text not null default 'draft',
  operator_name text,
  opened_at timestamptz,
  sent_at timestamptz,
  result_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  order_id uuid not null references public.repair_orders(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  operator_name text,
  created_at timestamptz not null default now()
);

alter table public.stores enable row level security;
alter table public.customers enable row level security;
alter table public.devices enable row level security;
alter table public.repair_orders enable row level security;
alter table public.message_templates enable row level security;
alter table public.message_logs enable row level security;
alter table public.order_events enable row level security;

create or replace function public.current_store_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'store_id', '')::uuid
$$;

drop policy if exists "stores_read" on public.stores;
create policy "stores_read" on public.stores
for select
using (id = public.current_store_id());

drop policy if exists "customers_read" on public.customers;
create policy "customers_read" on public.customers
for select
using (deleted_at is null and store_id = public.current_store_id());

drop policy if exists "devices_read" on public.devices;
create policy "devices_read" on public.devices
for select
using (deleted_at is null and store_id = public.current_store_id());

drop policy if exists "repair_orders_read" on public.repair_orders;
create policy "repair_orders_read" on public.repair_orders
for select
using (deleted_at is null and store_id = public.current_store_id());

drop policy if exists "message_templates_read" on public.message_templates;
create policy "message_templates_read" on public.message_templates
for select
using (deleted_at is null and store_id = public.current_store_id());

drop policy if exists "message_logs_read" on public.message_logs;
create policy "message_logs_read" on public.message_logs
for select
using (store_id = public.current_store_id());

drop policy if exists "order_events_read" on public.order_events;
create policy "order_events_read" on public.order_events
for select
using (store_id = public.current_store_id());

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

create table if not exists public.inventory_attachments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  kind text not null check (kind in ('id_front', 'id_back', 'invoice', 'box', 'other')),
  storage_path text not null,
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_attachments_item_idx on public.inventory_attachments(inventory_item_id);

alter table public.inventory_attachments enable row level security;

drop policy if exists "inventory_attachments_read" on public.inventory_attachments;
create policy "inventory_attachments_read" on public.inventory_attachments
for select
using (store_id = public.current_store_id());

insert into storage.buckets (id, name, public)
values ('inventory-docs', 'inventory-docs', false)
on conflict (id) do nothing;

create table if not exists public.inventory_create_idempotency (
  store_id uuid not null references public.stores(id) on delete cascade,
  idempotency_key text not null,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, idempotency_key)
);

create index if not exists inventory_create_idempotency_item_idx
  on public.inventory_create_idempotency(inventory_item_id);

alter table public.inventory_create_idempotency enable row level security;

drop policy if exists "inventory_create_idempotency_read" on public.inventory_create_idempotency;
create policy "inventory_create_idempotency_read" on public.inventory_create_idempotency
for select
using (store_id = public.current_store_id());
