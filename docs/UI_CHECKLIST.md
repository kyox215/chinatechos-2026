# UI 自检清单

> 新页面 / UI PR 合并前请逐条勾选。失败一条即视为不通过。

## 设计令牌

- [ ] 没有任意 hex / rgb / `text-white` / `bg-black` 等硬编码颜色
- [ ] 状态色成对使用 `bg-status-*` + `text-status-*-foreground`
- [ ] 品牌强调只用 `var(--gradient-brand)` 或 `gradient-text`
- [ ] 字体只用 `font-sans` / `font-display` / `font-mono`
- [ ] 数字使用 `tabular-nums` 或 `font-mono`

## 布局

- [ ] 没有重复包裹 Sidebar / AppBar，复用应用壳
- [ ] 内容包在 `mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6`
- [ ] 套用了三种页面配方之一（Dashboard / 列表 / 详情）
- [ ] 侧栏与移动 Sheet 未引入透明 / 模糊背景

## 路由 & SEO

- [ ] 页面文件位于 `apps/backoffice/src/app/` 对应路径
- [ ] `export const metadata` 配独立 `title` / `description`
- [ ] 面包屑 `breadcrumbLabels` 字典已加映射
- [ ] 如属导航页，已在 `<CommandPalette/>` 注册

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
- [ ] 侧栏展开 / 收起 / 移动 Sheet 三态均正常

## 状态

- [ ] Loading 用骨架屏（`animate-pulse bg-muted`）
- [ ] 错误用 `text-status-danger-foreground` 文案 + 重试入口
- [ ] 空态用 `glass-card` 居中卡片

## 数据 & 后端

- [ ] 服务端数据通过 Server Component + `src/lib/data/*.ts`
- [ ] 客户端交互通过 `fetch` + API Routes + `router.refresh()`
- [ ] 需要的后端能力走 Supabase
