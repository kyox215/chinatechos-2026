"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setError("缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: signErr } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) throw signErr;
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "登录失败";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="glass-card w-full max-w-sm p-6">
        <h1 className="mb-1 font-display text-lg font-semibold text-foreground">后台登录</h1>
        <p className="mb-4 text-xs text-muted-foreground">
          使用 Supabase Auth 账号登录后，可订阅工单实时更新（需在用户 metadata 中配置{" "}
          <code className="rounded bg-muted px-1">store_id</code> 以匹配 RLS）。
        </p>
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="email">
              邮箱
            </label>
            <input
              autoComplete="email"
              className="ui-input h-10 w-full text-sm"
              id="email"
              onChange={(ev) => setEmail(ev.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="password">
              密码
            </label>
            <input
              autoComplete="current-password"
              className="ui-input h-10 w-full text-sm"
              id="password"
              onChange={(ev) => setPassword(ev.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {error ? <p className="text-xs text-status-danger-foreground">{error}</p> : null}
          <button className="ui-btn ui-btn-primary h-10 w-full text-sm" disabled={pending} type="submit">
            {pending ? "登录中..." : "登录"}
          </button>
        </form>
        <Link className="mt-4 block text-center text-xs text-primary hover:underline" href="/dashboard">
          返回工作台
        </Link>
      </div>
    </div>
  );
}
