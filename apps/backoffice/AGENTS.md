<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Architecture
Single Next.js 16.2.4 app at `apps/backoffice/` — serves both UI (App Router) and API routes. Database is Supabase (PostgreSQL with RLS). No separate backend services.

### Running services locally
1. **Supabase**: Requires Docker. Run `supabase start` from repo root (after `supabase init --force` if first time). Apply schema: `docker cp supabase/schema.sql supabase_db_workspace:/tmp/schema.sql && docker exec supabase_db_workspace psql -U postgres -d postgres -f /tmp/schema.sql`
2. **Next.js dev server**: `cd apps/backoffice && npm run dev -- -p 3100`. Requires `.env.local` with Supabase credentials (get them from `supabase status -o env`).

### Environment variables needed in `apps/backoffice/.env.local`
- `NEXT_PUBLIC_SUPABASE_URL` — from `supabase status` API_URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from `supabase status` ANON_KEY
- `SUPABASE_SERVICE_ROLE_KEY` — from `supabase status` SERVICE_ROLE_KEY
- `DEFAULT_STORE_ID` — UUID from `stores` table (must create one)

### Key commands
- **Lint**: `cd apps/backoffice && npx eslint .`
- **Build**: `cd apps/backoffice && npx next build`
- **Dev**: `cd apps/backoffice && npm run dev -- -p 3100`

### Gotchas
- The app uses a service role key (bypasses RLS) so all data queries work without auth JWT.
- No test framework is configured — there are no unit/integration tests to run.
- Node.js v22+ is required (Next.js 16 dependency). Use fnm: `fnm install 22 && fnm use 22`.
- Docker must be started before `supabase start`: ensure `dockerd` is running.

## UI 开发规范 (所有改动必须遵循)

### 响应式原则 — Mobile First

所有组件先写移动端样式，再用断点递增适配桌面。

| 断点 | 宽度 | 布局策略 |
|------|------|----------|
| 默认 | `<640px` | 单列、全宽表单、堆叠布局 |
| `sm` | `≥640px` | 工具栏可横排 (`sm:flex-row`) |
| `md` | `≥768px` | 侧边栏出现、输入框缩至 36px、padding 增加 |
| `lg` | `≥1024px` | 可出现表格视图 (替换卡片列表) |
| `xl` | `≥1280px` | 双列/三列网格 (`xl:grid-cols-2`) |

### Modal / 弹窗规范

**禁止全屏白色覆盖 (`fixed inset-0 bg-white`)**。所有 Modal 必须使用以下模式:

```tsx
// 外层: 遮罩 + 定位
<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-4">
  // 内层: 面板
  <div className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-lg
    md:max-w-2xl md:rounded-2xl md:max-h-[85vh]">
    // 固定头部
    <div className="flex items-center justify-between border-b border-border px-4 py-3">...</div>
    // 可滚动内容
    <div className="flex-1 overflow-y-auto px-4 py-4">
      // 移动端单列，桌面端多列
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">...</div>
    </div>
    // 固定底部按钮
    <div className="flex justify-end gap-3 border-t border-border px-4 py-3">...</div>
  </div>
</div>
```

- **移动端**: 底部抽屉 (`items-end`)，圆角顶部 (`rounded-t-2xl`)
- **桌面端**: 居中浮层 (`md:items-center`)，四角圆角 (`md:rounded-2xl`)
- **最大高度**: `max-h-[85dvh]`，内容区 `overflow-y-auto`
- **固定底部按钮**: 不随内容滚动

### 设计 Token — 必须使用

| 用途 | 正确写法 | 禁止写法 |
|------|----------|----------|
| 表面背景 | `bg-surface` / `bg-surface-2` | `bg-white` |
| 边框 | `border-border` | `border-gray-200` |
| 悬停/选中 | `bg-muted` | `bg-gray-50` |
| 主色 | `bg-primary` / `text-primary` | `#4f46e5` / `bg-indigo-600` |
| 按钮 | `ui-btn ui-btn-primary` | 自定义 class |
| 输入 | `ui-input` | 自定义 class |
| 面板 | `ui-panel` | 自定义 border+bg+padding |
| 焦点环 | 由 `ui-btn` / `ui-input` 自带 | 手写 `ring-*` |

### 尺寸规范

| 元素 | 移动端 | 桌面 (`md:`) |
|------|--------|-------------|
| 按钮/输入高度 | `h-10` (40px) | `md:h-9` (36px) |
| 面板内距 | `p-3` | `md:p-4` |
| 间距 | `gap-3` | `md:gap-4` |
| 圆角: 卡片 | `rounded-2xl` | — |
| 圆角: 按钮/输入 | `rounded-xl` | — |
| 圆角: Badge | `rounded-full` | — |
| 最小点击区域 | 40×40px | 36×36px |

### 列表视图规范

- 移动端 (`<lg`): 卡片列表 (`space-y-3`)，每张卡片用 `ui-panel` 或 `rounded-xl border border-border bg-surface-2 p-3`
- 桌面端 (`lg:`): 表格视图 (`hidden lg:block`)，使用 `overflow-x-auto` 防溢出
- 操作按钮在列表中精简为 1 个主操作 + "详情"链接

### 组件约定

1. Server Component 负责数据获取，Client Component 负责交互
2. 表单提交: 受控组件 + `fetch` API route + `router.refresh()`
3. 颜色状态: 通过 `lib/` 层返回 Tailwind class 字符串 (如 `OrderStatusBadge`)
4. 响应式切换: 同一组件内用 Tailwind 断点，不拆分 mobile/desktop 版本
