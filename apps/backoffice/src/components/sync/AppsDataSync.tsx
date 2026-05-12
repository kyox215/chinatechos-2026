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

    let ordersChannel: RealtimeChannel | null = null;
    let eventsChannel: RealtimeChannel | null = null;

    function subscribeIfSession() {
      const sb = getSupabaseBrowserClient();
      if (!sb) return;
      void sb.auth.getSession().then(({ data: { session } }) => {
        ordersChannel?.unsubscribe();
        eventsChannel?.unsubscribe();
        ordersChannel = null;
        eventsChannel = null;
        if (!session?.user) return;

        const filter = `store_id=eq.${storeFilterId}`;
        ordersChannel = sb
          .channel(`repair_orders:${storeFilterId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "repair_orders", filter },
            () => scheduleRefresh(),
          )
          .subscribe();

        eventsChannel = sb
          .channel(`order_events:${storeFilterId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "order_events", filter },
            () => scheduleRefresh(),
          )
          .subscribe();
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
      ordersChannel?.unsubscribe();
      eventsChannel?.unsubscribe();
    };
  }, [props.storeId, scheduleRefresh]);

  return null;
}
