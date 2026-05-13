"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function parsePollMs(): number {
  const raw = process.env.NEXT_PUBLIC_DATA_REFRESH_INTERVAL_MS;
  if (raw === "0") return 0;
  const n = Number(raw ?? "20000");
  return Number.isFinite(n) && n >= 0 ? n : 20000;
}

const POLL_MS = parsePollMs();
const REALTIME_DISABLED = process.env.NEXT_PUBLIC_SUPABASE_REALTIME === "0";

/** Tables with `store_id` — Realtime filter matches current JWT store (see current_store_id()). */
const STORE_SCOPED_REALTIME_TABLES = [
  "repair_orders",
  "order_events",
  "inventory_items",
  "inventory_events",
  "customers",
  "devices",
] as const;

/**
 * Keeps Server Components fresh: optional polling + Supabase Realtime when the user is signed in
 * (JWT must expose store_id via root claim or app_metadata — see current_store_id()).
 */
export function AppsDataSync(props: { storeId: string | null }) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      router.refresh();
    }, 450);
  }, [router]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  useEffect(() => {
    if (POLL_MS <= 0) return;
    const id = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (REALTIME_DISABLED || !props.storeId) return;
    const storeFilterId = props.storeId;

    let syncChannel: RealtimeChannel | null = null;

    function subscribeIfSession() {
      const sb = getSupabaseBrowserClient();
      if (!sb) return;
      void sb.auth.getSession().then(({ data: { session } }) => {
        syncChannel?.unsubscribe();
        syncChannel = null;
        if (!session?.user) return;

        const filter = `store_id=eq.${storeFilterId}`;
        let ch = sb.channel(`store_sync:${storeFilterId}`);
        for (const table of STORE_SCOPED_REALTIME_TABLES) {
          ch = ch.on(
            "postgres_changes",
            { event: "*", schema: "public", table, filter },
            () => scheduleRefresh(),
          );
        }
        syncChannel = ch.subscribe();
      });
    }

    subscribeIfSession();
    const sbListener = getSupabaseBrowserClient();
    if (!sbListener) return () => {};
    const { data: sub } = sbListener.auth.onAuthStateChange(() => {
      subscribeIfSession();
      scheduleRefresh();
    });

    return () => {
      sub.subscription.unsubscribe();
      syncChannel?.unsubscribe();
    };
  }, [props.storeId, scheduleRefresh]);

  return null;
}
