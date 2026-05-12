-- Resolve store_id from JWT root claim or Supabase app_metadata / user_metadata (Realtime + RLS).
create or replace function public.current_store_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'store_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'store_id', '')::uuid,
    nullif(auth.jwt() -> 'user_metadata' ->> 'store_id', '')::uuid
  )
$$;

-- Broadcast row changes to Supabase Realtime subscribers (idempotent per environment).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'repair_orders'
    ) then
      alter publication supabase_realtime add table public.repair_orders;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_events'
    ) then
      alter publication supabase_realtime add table public.order_events;
    end if;
  end if;
end$$;
