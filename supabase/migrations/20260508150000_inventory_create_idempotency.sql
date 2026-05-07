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
