# UI 自检清单

> 新页面 / UI PR 合并前请逐条勾选。失败一条即视为不通过。

## 设计令牌

- [ ] 没有任意 hex / rgb / `text-white` / `bg-black` 等硬编码颜色
- [ ] 状态色成对使用 `bg-status-*` + `text-status-*-foreground`
- [ ] 品牌强调只用 `var(--gradient-brand)` 或 `gradient-text`
- [ ] 字体只用 `font-sans` / `font-display` / `font-mono`
- [ ] 数字使用 `tabular-nums` 或 `font-mono`

## 布局

- [ ] 没有重复包裹 Sidebar / AppBar，复用根 shell
- [ ] 内容包在 `mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6`
- [ ] 套用了三种页面配方之一（Dashboard / 列表 / 详情）
- [ ] 侧栏与移动 Sheet 未引入透明 / 模糊背景

## 路由 & SEO（Next.js App Router）

- [ ] 页面位于 `apps/backoffice/src/app/**`；动态路由使用 `[param]` 目录
- [ ] 导出 `export const metadata` 或 `generateMetadata`，含 `title` / `description`（需分享预览时在 metadata 中配置 `openGraph` 等）
- [ ] 面包屑文案在 [`TopBar.tsx`](../../apps/backoffice/src/components/TopBar.tsx) 的 `breadcrumbLabels` 中维护
- [ ] 需全局检索的导航已在 [`command-palette.tsx`](../../apps/backoffice/src/components/command-palette.tsx) 注册

## 动效 & 无障碍

- [ ] framer-motion variants 来自 `@/lib/motion`，未自造
- [ ] 列表用 `stagger` + `fadeUp`
- [ ] 图标按钮带 `aria-label`，侧栏项带 `tooltip`
- [ ] 焦点环可见，键盘可达
- [ ] 文本对比度 ≥ WCAG AA

## 响应式 & 主题

- [ ] 750px 移动视口（DPR 2）布局正常
- [ ] ≥ 1280px 桌面视口布局正常
- [ ] 暗色主题验证通过
- [ ] 亮色主题验证通过
- [ ] 侧栏展开 / `collapsible=icon` / 移动 Sheet 三态均正常

## 状态

- [ ] Loading 用 `<Skeleton/>`
- [ ] 错误用 `text-status-danger-foreground` 文案 + 重试入口
- [ ] 空态用 `glass-card` 居中卡片

## 数据 & 后端（本仓库约定）

- [ ] 列表/详情默认在 **Server Component** 中调用 `apps/backoffice/src/lib/data/*.ts`
- [ ] 客户端变更通过 `fetch('/api/...')` 与 `router.refresh()`（或与模块内 Server Actions 约定一致）
- [ ] Webhook / 定时任务在 `src/app/api/**` 暴露时按需验签（参见 `.cursor/rules/60-stack-conventions.mdc`）
- [ ] 数据库 / 鉴权 / 实时等使用 **Supabase** 时，环境变量与 RLS 与门店隔离策略已核对
