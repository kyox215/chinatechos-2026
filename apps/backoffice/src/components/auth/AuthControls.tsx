"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthControls() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;

    void sb.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });

    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  async function logout() {
    const sb = getSupabaseBrowserClient();
    await sb?.auth.signOut();
    router.refresh();
  }

  return (
    <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
      {email ? (
        <>
          <span className="hidden max-w-[140px] truncate text-xs text-neutral-500 sm:inline" title={email}>
            {email}
          </span>
          <button
            className="ui-btn ui-btn-secondary h-8 shrink-0 px-2 text-xs"
            onClick={() => void logout()}
            type="button"
          >
            退出
          </button>
        </>
      ) : (
        <Link className="ui-btn ui-btn-secondary flex h-8 shrink-0 items-center px-2 text-xs" href="/login">
          登录
        </Link>
      )}
    </div>
  );
}
