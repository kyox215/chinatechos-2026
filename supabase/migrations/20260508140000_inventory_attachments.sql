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
