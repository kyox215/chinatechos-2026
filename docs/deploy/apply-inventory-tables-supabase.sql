-- =============================================================================
-- 商品管理 / 库存表 — 一次性在 Supabase SQL Editor 中执行（整段 Run）
-- 来源：按序合并
--   supabase/migrations/20260507120000_inventory_items.sql
--   supabase/migrations/20260508140000_inventory_attachments.sql
--   supabase/migrations/20260508150000_inventory_create_idempotency.sql
--
-- 前置条件（本仓库主 schema 应已具备）：
--   - public.stores、public.customers、public.repair_orders 已存在
--   - public.current_store_id() 已存在（见 supabase/schema.sql）
-- 若主库尚未初始化，请先执行仓库根目录 supabase/schema.sql 再跑本脚本。
-- =============================================================================

create extension if not exists pgcrypto;

-- 1) inventory_items + inventory_events
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

-- 2) inventory_attachments + Storage bucket
-- Attachments for inventory items (trade-in docs); Supabase Storage bucket inventory-docs

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

-- 3) inventory_create_idempotency
-- Idempotent POST /api/inventory: map Idempotency-Key -> inventory_item_id per store

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
