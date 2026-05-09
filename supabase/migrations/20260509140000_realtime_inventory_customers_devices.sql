-- Include inventory + customer tables in Supabase Realtime publication (store-scoped rows).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory_items'
    ) then
      alter publication supabase_realtime add table public.inventory_items;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory_events'
    ) then
      alter publication supabase_realtime add table public.inventory_events;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customers'
    ) then
      alter publication supabase_realtime add table public.customers;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
    ) then
      alter publication supabase_realtime add table public.devices;
    end if;
  end if;
end$$;
