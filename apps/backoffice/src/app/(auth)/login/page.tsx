import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录 — ChinaTechOS",
  description: "登录 ChinaTechOS 后台管理系统",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-10">
      <div className="glass-card w-full max-w-sm p-6">
        <div className="font-display text-lg font-semibold">登录</div>
        <div className="mt-1 text-sm text-muted-foreground">MVP：先搭建页面壳，鉴权后续接入。</div>

        <form className="mt-6 space-y-3">
          <label className="block">
            <div className="text-sm font-medium">账号</div>
            <input className="ui-input mt-1 h-10 w-full md:h-9" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">密码</div>
            <input className="ui-input mt-1 h-10 w-full md:h-9" type="password" />
          </label>

          <button
            className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-medium text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
            type="button"
          >
            继续（占位）
          </button>
        </form>
      </div>
    </main>
  );
}
