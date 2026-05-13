# RepairDesk UI 设计总纲（复刻 & 扩展唯一参考）

> 本文件是 Cursor 复刻本项目的 **唯一** UI 设计声明。任何新增组件、新增页面、新增视觉都必须严格遵守本文件。
> 配套读物：`COLOR_DESIGN_SPEC.md`（颜色 Token 全集）、`DESIGN_SYSTEM.md`（设计系统）、`ORDERS_FULL_EXPORT.md`（工单页参考实现）、`UI_CHECKLIST.md`（验收清单）、`.cursor/rules/*.mdc`（Cursor 强制规则）。

---

## 1. 设计哲学（DNA）

| 维度 | 决策 |
|---|---|
| 风格 | **暗色玻璃拟态（Glassmorphism Dark）** + **brand 渐变（violet → cyan）** |
| 气质 | 高频后台工作工具，但保留富有生命力的微交互 |
| 字体 | 显示 `Space Grotesk` / 正文 `Inter` / 数字 `JetBrains Mono` |
| 圆角 | 基础 `--radius` = 14px，卡片 18–22px，大容器 28px |
| 阴影 | 柔和长投影 + 内发光（`inset 0 1px 0 rgba(255,255,255,0.06)`） |
| 渐变 | `--gradient-brand: linear-gradient(135deg, oklch(0.62 0.22 295), oklch(0.78 0.15 200))` |
| 动效 | framer-motion；入场 ≤ 400ms，hover ≤ 200ms |
| 信息密度 | 中高密度，但留出呼吸空间（行高 1.5+，分组间距 24/32px） |
| 中文 | 全部 UI 文案中文，标题用 `font-display`，正文用 `font-sans` |

---

## 2. 颜色 Token 使用规则（**绝对**）

1. **永远不要** 在组件里写 `bg-white` / `text-black` / `bg-[#xxx]` / `text-violet-500`。
2. 只用 `src/styles.css` 暴露的 semantic tokens：`bg-background` `bg-card` `bg-muted` `text-foreground` `text-muted-foreground` `border-border` `ring-ring` `bg-primary` `text-primary-foreground`。
3. 状态颜色统一走 `--status-{neutral|info|progress|warn|success|danger}`，配套 `*-foreground`。例如 Badge：`bg-status-success/10 text-status-success border-status-success/30`。
4. 渐变只用 `bg-[image:var(--gradient-brand)]` / `bg-[image:var(--gradient-brand-soft)]` / `bg-[image:var(--gradient-surface)]`。
5. 暗 / 亮主题切换：在 `<html>` 上加/去 `.dark`，所有 token 自动响应，组件不感知。
6. 任何新颜色必须 **先** 在 `src/styles.css` 加 token，再在组件里用。

完整 token 列表：见 `COLOR_DESIGN_SPEC.md`。

---

## 3. 布局骨架

```
__root.tsx
 ├─ <BackgroundOrbs />        ← 全局背景光斑（fixed，z-0）
 ├─ <AppSidebar />            ← 桌面左侧栏（≥ md）
 ├─ <BottomTabBar />          ← 移动底部 tab（< md）
 ├─ <AppHeader />             ← 顶部栏，含 ⌘K、主题切换、用户
 └─ <main> <Outlet/> </main>  ← 路由出口，带 RouteTransition 淡入
```

- 桌面：`grid-cols-[260px_1fr]`，sidebar 不毛玻璃（实色，避免性能问题）。
- 移动：单列，底部 64px tab bar，header 56px。
- 内容容器：`max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-10`。
- 滚动区域：让 `<main>` 滚动，sidebar / header 固定。
- Hero 区域支持 `useScroll + useTransform` 折叠（参考 `orders.index.tsx`）。

---

## 4. 组件库映射

所有基础组件来自 **shadcn/ui**（Radix + Tailwind），位于 `src/components/ui/*`。
**不要重写**这些文件；如需变体，在外面包一层或加 `cva` variant。

| 用途 | 组件 |
|---|---|
| 按钮 | `Button` (variant: default / secondary / outline / ghost / destructive / link) |
| 输入 | `Input` `Textarea` `Select` `Checkbox` `Switch` `RadioGroup` `Slider` |
| 容器 | `Card` `Dialog` `Sheet` `Popover` `HoverCard` `Tooltip` `Drawer` |
| 数据 | `Table` `Tabs` `Badge` `Avatar` `Progress` `Skeleton` `Chart` |
| 导航 | `DropdownMenu` `Command` (⌘K) `Breadcrumb` `Pagination` `Sidebar` |
| 反馈 | `Sonner` (toast) `Alert` `AlertDialog` |

业务组件位于 `src/components/`：
- `app-sidebar.tsx` `app-header.tsx` `app-bar.tsx` `bottom-tab-bar.tsx` `top-nav.tsx`
- `background-orbs.tsx` `command-palette.tsx` `theme-toggle.tsx`
- `animated-number.tsx` `sparkline.tsx`
- `orders/badges.tsx`（工单状态徽章 15 种状态机）

---

## 5. 动效规范（framer-motion）

**所有动效**必须从 `@/lib/motion` 导入 variants，不自造：

```ts
fadeUp        // 入场上滑 + fade
scaleIn       // 缩放入场
stagger(gap)  // 列表交错
cardHover     // whileHover y:-2 / -3
pageTransition// 路由切换
ease          // [0.22, 1, 0.36, 1] cubic
```

- 列表：`stagger(0.04~0.06)` + `fadeUp`
- 卡片悬停：`whileHover={{ y: -2 }}`
- 路由切换：由 `RouteTransition`（在 `__root.tsx`）统一处理，**页面内不加** `AnimatePresence`
- 数字滚动：`<AnimatedNumber value={x} />`
- 折线火花：`<Sparkline data={[...]} />`
- 必须尊重 `prefers-reduced-motion`（CSS 已全局处理；JS 动画自检）

---

## 6. 路由 & 数据约定（TanStack Start）

- 文件位于 `src/routes/`，**扁平点号命名**：`orders.$id.tsx` → `/orders/:id`
- 唯一根布局：`src/routes/__root.tsx`；**不要** `_app/`、`app/layout.tsx`
- **不编辑** `src/routeTree.gen.ts`（自动生成）
- 导航统一从 `@tanstack/react-router` 导入：`Link` `useNavigate` `useRouter` `Outlet`
- 不带尾斜杠：`to="/orders"` ✓
- 数据：`@tanstack/react-query`，key 形如 `["resource", filters]`
- mock 数据：`src/lib/mock/{api,fixtures,enums}.ts`
- 服务端逻辑：`createServerFn` → `*.functions.ts`，放 `src/lib/`
- 后端能力默认走 **Lovable Cloud**

---

## 7. 当前页面清单（必须 1:1 复刻）

| 路由 | 文件 | 内容 |
|---|---|---|
| `/` | `routes/index.tsx` | Dashboard：KPI 卡 × 4、今日工单趋势 sparkline、最近工单表、快捷动作 |
| `/orders` | `routes/orders.tsx` (layout) + `orders.index.tsx` | 工单列表：折叠 hero（4 张统计卡）+ 全状态 Tabs + 表格 + 搜索/筛选 |
| `/orders/new` | `routes/orders.new.tsx` | 新建工单表单（Sheet 风格） |
| `/orders/:id` | `routes/orders.$id.tsx` | 工单详情：状态时间线 + 客户/设备/收费/备注 区块 |
| `/customers` | `routes/customers.tsx` | 客户列表（占位 + ComingSoon） |
| `/inventory` | `routes/inventory.tsx` | 库存（占位） |
| `/messages` | `routes/messages.tsx` | 消息中心（占位） |
| `/settings` | `routes/settings.tsx` | 设置（占位） |

每个路由 **必须** 写 `head()` 元信息（title < 60 字、description < 160 字、og:title、og:description）。

---

## 8. 工单 15 状态机（业务关键）

详见 `ORDERS_FULL_EXPORT.md`。核心：

```
待登记 → 已登记 → 待诊断 → 诊断中 → 待报价 → 报价中 → 待维修
      → 维修中 → 待质检 → 质检中 → 待取件 → 已完成
                ↘ 已取消 / 已退款 / 已转出
```

每个状态映射到 `--status-*` 颜色 token，徽章组件统一在 `components/orders/badges.tsx`。

---

## 9. 新增组件设计指南（**Cursor 必读**）

当用户要求新增组件 / 区块时，**严格按以下流程**：

### 9.1 第一步：能否复用？
1. 是否能用现有 `src/components/ui/*` 直接拼？→ 拼。
2. 是否能在现有业务组件外包一层 → 包。
3. 否则进入第二步。

### 9.2 第二步：在哪里建？
- 通用 UI 原子 → `src/components/ui/{name}.tsx`（仅当 shadcn 没有）
- 业务组件 → `src/components/{feature}/{name}.tsx`，例如 `orders/`、`customers/`
- 页面专属、不复用 → 直接写在路由文件里

### 9.3 第三步：外观规则（不可妥协）
- ✅ 用 `cn()` 合并 className（来自 `@/lib/utils`）
- ✅ 用 semantic tokens（参考第 2 节）
- ✅ 圆角：原子组件 `rounded-md`、卡片 `rounded-2xl`、弹层 `rounded-xl`
- ✅ 边框：`border border-border/60`，hover 时 `border-border`
- ✅ 阴影：`shadow-sm` 或自定义 `shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]`
- ✅ 内边距：紧凑 `p-3`、标准 `p-4 md:p-6`、宽松 `p-6 md:p-8`
- ✅ 间距：内部用 `space-y-3/4/6`、`gap-3/4/6`
- ✅ 字号：标题 `text-lg md:text-xl font-display font-semibold`、正文 `text-sm`、辅助 `text-xs text-muted-foreground`
- ❌ 不写 hex / 自定义颜色名
- ❌ 不写内联 style 颜色
- ❌ 不在 sidebar 上用 `backdrop-blur`

### 9.4 第四步：交互规则
- 所有可点击元素：`focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`
- 图标按钮：`aria-label` 必填；侧栏项 `tooltip={title}`
- 表单：`<Label htmlFor>` + 错误用 `aria-describedby`
- 过渡：`transition-colors duration-200` / `transition-transform duration-200`
- 悬停 elevation：`hover:-translate-y-0.5 hover:shadow-lg`

### 9.5 第五步：动效（如果需要）
- 优先用 framer-motion + `@/lib/motion` 现成 variants
- 入场 ≤ 400ms，hover ≤ 200ms
- 不要在路由级别加 `AnimatePresence`（已全局处理）

### 9.6 第六步：响应式
- Mobile-first；断点：`sm 640` `md 768` `lg 1024` `xl 1280`
- 桌面表格 / 移动卡片：在 `md` 切换，例如 `hidden md:block` + `md:hidden`
- 触控区域 ≥ 40px

### 9.7 第七步：无障碍 & SEO
- 对比度 WCAG AA
- 图标按钮带 `aria-label`，装饰图标 `aria-hidden`
- 图片 `alt` 必填
- 路由必填 `head()` meta（title、description、og:*）

### 9.8 模板：新业务组件骨架

```tsx
// src/components/{feature}/{name}.tsx
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";

interface Props {
  className?: string;
  // ... 业务 props
}

export function MyCard({ className, children }: Props & { children?: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2 }}
      className={cn(
        "rounded-2xl border border-border/60 bg-card text-card-foreground",
        "p-4 md:p-6 shadow-sm transition-colors",
        "hover:border-border hover:shadow-lg",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
```

---

## 10. 验收清单（每次提交前自检）

- [ ] 亮 / 暗主题都正常（切换 `<html class="dark">`）
- [ ] 桌面（≥ 1280px）+ 移动（375px）均无溢出 / 错位
- [ ] 没有硬编码颜色 / hex
- [ ] 所有路由有 `head()` meta
- [ ] 图标按钮有 `aria-label`
- [ ] 焦点环可见
- [ ] 动效 ≤ 400ms 入场 / ≤ 200ms 悬停
- [ ] 与 sidebar 同色系，没有违和卡片
- [ ] 中文文案、不要英中混杂
- [ ] `npm run build` 通过（CI 自动）

---

## 11. 文件索引

```
src/
  styles.css                ← 颜色 / 字体 / 半径 / 渐变 / 阴影所有 token
  router.tsx                ← TanStack Router 配置
  routes/
    __root.tsx              ← 根布局：Sidebar + Header + Outlet
    index.tsx               ← Dashboard
    orders.tsx              ← /orders layout
    orders.index.tsx        ← 工单列表
    orders.$id.tsx          ← 工单详情
    orders.new.tsx          ← 新建工单
    customers/inventory/messages/settings.tsx  ← 占位页
  components/
    app-sidebar.tsx app-header.tsx app-bar.tsx top-nav.tsx
    bottom-tab-bar.tsx background-orbs.tsx command-palette.tsx
    theme-toggle.tsx coming-soon.tsx
    animated-number.tsx sparkline.tsx
    orders/badges.tsx       ← 15 状态徽章
    ui/*                    ← shadcn 全集
  lib/
    utils.ts                ← cn()
    motion.ts               ← 所有 framer-motion variants
    mock/{api,fixtures,enums}.ts  ← mock 数据
  hooks/use-mobile.tsx
docs/
  UI_DESIGN_MASTER.md       ← 本文件
  COLOR_DESIGN_SPEC.md      ← 颜色 token 详表
  DESIGN_SYSTEM.md
  ORDERS_FULL_EXPORT.md     ← 工单页 1:1 实现参考
  ORDERS_SPEC.md
  UI_CHECKLIST.md
.cursor/rules/*.mdc         ← Cursor 强制规则（alwaysApply）
```

---

## 12. 给 Cursor 的快速 prompt

> 复刻本项目时使用：

```
请严格按照 docs/UI_DESIGN_MASTER.md 与 .cursor/rules/*.mdc 工作。
1. 颜色只用 src/styles.css 里的 semantic tokens，不写 hex。
2. 组件优先复用 src/components/ui/*（shadcn）。
3. 动效从 @/lib/motion 导入，不自造 variants。
4. 路由文件命名遵循 TanStack Start 扁平点号约定，不要编辑 routeTree.gen.ts。
5. 每个路由必填 head() meta。
6. 新增业务组件参考 UI_DESIGN_MASTER.md §9 模板。
7. 工单状态机参考 ORDERS_FULL_EXPORT.md。
完成后用 UI_CHECKLIST.md 自检。
```
