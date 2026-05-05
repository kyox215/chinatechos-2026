# 后台 MVP（网站搭建）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在本仓库中从零搭建“手机维修后台 MVP”的可运行网站工程骨架（含路由、布局、基础 UI、环境变量模板与本地启动），为后续接入鉴权、数据库与业务模块打底。

**Architecture:** 采用 Next.js（App Router）作为全栈框架，先搭好后台页面壳（Dashboard / Orders / Customers / Messages / Settings）与统一布局；业务规则（状态机/待办计算/模板渲染）后续沉淀为独立 domain 层。

**Tech Stack:** Next.js + TypeScript + Tailwind CSS（首阶段）；后续按里程碑接入 PostgreSQL（Vercel Postgres/Neon）与 ORM（待定）。

---

## File Structure（本阶段落盘）

- Create: `apps/backoffice/`（后台站点工程根目录）
- Create: `apps/backoffice/.env.example`
- Create: `apps/backoffice/src/app/(auth)/login/page.tsx`
- Create: `apps/backoffice/src/app/(app)/layout.tsx`
- Create: `apps/backoffice/src/app/(app)/dashboard/page.tsx`
- Create: `apps/backoffice/src/app/(app)/orders/page.tsx`
- Create: `apps/backoffice/src/app/(app)/customers/page.tsx`
- Create: `apps/backoffice/src/app/(app)/messages/templates/page.tsx`
- Create: `apps/backoffice/src/app/(app)/messages/logs/page.tsx`
- Create: `apps/backoffice/src/app/(app)/settings/page.tsx`
- Create: `apps/backoffice/src/components/AppShell.tsx`
- Create: `apps/backoffice/src/components/Nav.tsx`

---

### Task 1: 初始化 Next.js 工程（网站搭建起步）

**Files:**
- Create: `apps/backoffice/*`

- [ ] **Step 1: 创建目录并初始化 Next.js（TypeScript + Tailwind + App Router）**

Run (from repo root):

```bash
mkdir -p apps
cd apps
npm create next-app@latest backoffice -- --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected:
- 生成 `apps/backoffice/package.json`
- 能看到 Next.js 默认页面

- [ ] **Step 2: 本地启动并验证可访问**

Run:

```bash
cd apps/backoffice
npm run dev
```

Expected:
- 终端输出包含 `Local: http://localhost:3000`
- 浏览器打开后能看到默认页面（先不改 UI）

- [ ] **Step 3: 添加环境变量模板**

Create `apps/backoffice/.env.example`：

```dotenv
NEXT_PUBLIC_APP_NAME="ChinaTechOS Backoffice"
APP_TIMEZONE="Europe/Rome"
DEFAULT_PHONE_COUNTRY="+39"
```

- [ ] **Step 4: 提交一次“可运行骨架”**

Run:

```bash
git init
git add apps/backoffice docs/plan/2026-05-05-backend-mvp-implementation.md
git commit -m "chore: bootstrap backoffice nextjs app"
```

---

### Task 2: 建立后台路由分组与壳（App Shell）

**Files:**
- Create: `apps/backoffice/src/app/(auth)/login/page.tsx`
- Create: `apps/backoffice/src/app/(app)/layout.tsx`
- Create: `apps/backoffice/src/app/(app)/*/page.tsx`
- Create: `apps/backoffice/src/components/AppShell.tsx`
- Create: `apps/backoffice/src/components/Nav.tsx`
- Modify: `apps/backoffice/src/app/page.tsx`

- [ ] **Step 1: 将默认首页改为跳转到后台（临时策略）**

Modify `apps/backoffice/src/app/page.tsx`：

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 2: 创建登录页（纯占位，不接入鉴权）**

Create `apps/backoffice/src/app/(auth)/login/page.tsx`：

```tsx
export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-neutral-50 px-6 py-10">
      <div className="mx-auto w-full max-w-sm rounded-xl border bg-white p-6">
        <div className="text-lg font-semibold">登录</div>
        <div className="mt-1 text-sm text-neutral-600">
          MVP：先搭建页面壳，鉴权后续接入。
        </div>

        <form className="mt-6 space-y-3">
          <label className="block">
            <div className="text-sm font-medium">账号</div>
            <input className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">密码</div>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="password" />
          </label>

          <button
            className="mt-2 w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
            type="button"
          >
            继续（占位）
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: 创建 AppShell 与侧边导航**

Create `apps/backoffice/src/components/Nav.tsx`：

```tsx
import Link from "next/link";

type NavItem = { href: string; label: string };

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "工单" },
  { href: "/customers", label: "客户" },
  { href: "/messages/templates", label: "消息模板" },
  { href: "/messages/logs", label: "发送记录" },
  { href: "/settings", label: "设置" },
];

export function Nav() {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => (
        <Link
          key={it.href}
          className="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
          href={it.href}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
```

Create `apps/backoffice/src/components/AppShell.tsx`：

```tsx
import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";

export function AppShell(props: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-50">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[240px_1fr] gap-6 px-6 py-6">
        <aside className="rounded-xl border bg-white p-3">
          <div className="px-3 py-2 text-sm font-semibold">ChinaTechOS</div>
          <div className="mt-2">
            <Nav />
          </div>
        </aside>
        <main className="rounded-xl border bg-white p-6">{props.children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 建立后台路由分组 layout**

Create `apps/backoffice/src/app/(app)/layout.tsx`：

```tsx
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export default function AppLayout(props: { children: ReactNode }) {
  return <AppShell>{props.children}</AppShell>;
}
```

- [ ] **Step 5: 创建各页面占位（便于后续逐步填充）**

Create `apps/backoffice/src/app/(app)/dashboard/page.tsx`：

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="text-sm text-neutral-600">待办与统计（后续接入）。</div>
    </div>
  );
}
```

Create `apps/backoffice/src/app/(app)/orders/page.tsx`：

```tsx
export default function OrdersPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">工单</h1>
      <div className="text-sm text-neutral-600">列表/搜索/筛选（后续接入）。</div>
    </div>
  );
}
```

Create `apps/backoffice/src/app/(app)/customers/page.tsx`：

```tsx
export default function CustomersPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">客户</h1>
      <div className="text-sm text-neutral-600">客户列表与详情（后续接入）。</div>
    </div>
  );
}
```

Create `apps/backoffice/src/app/(app)/messages/templates/page.tsx`：

```tsx
export default function MessageTemplatesPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">消息模板</h1>
      <div className="text-sm text-neutral-600">模板 CRUD（后续接入）。</div>
    </div>
  );
}
```

Create `apps/backoffice/src/app/(app)/messages/logs/page.tsx`：

```tsx
export default function MessageLogsPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">发送记录</h1>
      <div className="text-sm text-neutral-600">message_logs 查询（后续接入）。</div>
    </div>
  );
}
```

Create `apps/backoffice/src/app/(app)/settings/page.tsx`：

```tsx
export default function SettingsPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">设置</h1>
      <div className="text-sm text-neutral-600">门店与参数（后续接入）。</div>
    </div>
  );
}
```

- [ ] **Step 6: 验证路由与布局**

Run:

```bash
cd apps/backoffice
npm run dev
```

Expected:
- 访问 `/dashboard` 能看到 AppShell + Dashboard
- 左侧导航可跳转到各页面

- [ ] **Step 7: 提交本阶段 UI 壳**

Run:

```bash
git add apps/backoffice
git commit -m "feat(backoffice): add app shell and route skeleton"
```

---

## Self-Review（本计划自检）

- 覆盖“网站搭建起步”最小目标：工程可启动、路由可访问、页面壳与导航已落地
- 无占位词（TBD/TODO）作为计划步骤；后续功能以新的 Task 追加到同一计划或新计划
- 文件路径均为仓库内绝对相对路径，便于直接执行
