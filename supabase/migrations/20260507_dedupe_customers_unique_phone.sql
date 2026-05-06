-- Dedupe customers with same (store_id, phone_e164) while deleted_at IS NULL.
-- Canonical row per group: earliest created_at, then smallest id.
--
-- BEFORE APPLYING: backup the database (e.g. pg_dump / Supabase backup).
-- Safe to re-run only after duplicates are gone (second run is a no-op).

DO $$
DECLARE
  grp record;
  keep_id uuid;
  drop_id uuid;
  id_list uuid[];
  i int;
BEGIN
  FOR grp IN
    SELECT
      store_id,
      phone_e164,
      array_agg(id ORDER BY created_at ASC, id ASC) AS ids
    FROM public.customers
    WHERE deleted_at IS NULL
    GROUP BY store_id, phone_e164
    HAVING count(*) > 1
  LOOP
    id_list := grp.ids;
    keep_id := id_list[1];
    FOR i IN 2 .. array_length(id_list, 1) LOOP
      drop_id := id_list[i];

      UPDATE public.devices
      SET customer_id = keep_id, updated_at = now()
      WHERE customer_id = drop_id AND store_id = grp.store_id;

      UPDATE public.repair_orders
      SET customer_id = keep_id, updated_at = now()
      WHERE customer_id = drop_id AND store_id = grp.store_id;

      UPDATE public.message_logs
      SET customer_id = keep_id
      WHERE customer_id = drop_id AND store_id = grp.store_id;

      DELETE FROM public.customers WHERE id = drop_id;
    END LOOP;
  END LOOP;
END $$;

-- Replace redundant non-unique index with partial unique index (active rows only).
DROP INDEX IF EXISTS public.customers_store_phone_idx;

CREATE UNIQUE INDEX IF NOT EXISTS customers_store_phone_active_unique
  ON public.customers (store_id, phone_e164)
  WHERE deleted_at IS NULL;
