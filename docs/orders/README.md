# 工单模块规划文档（复制包落库）

本目录文档来自 **orders-replication-kit**（TanStack Start 示例实现），在 ChinaTechOS 中作为 **产品 / UI / 状态机** 的参考规范。

## 与本仓库实现的对应关系

| 复制包约定 | ChinaTechOS（`apps/backoffice`） |
|------------|----------------------------------|
| `src/routes/orders/*.tsx`、`createFileRoute` | [`src/app/(app)/orders/page.tsx`](../../apps/backoffice/src/app/(app)/orders/page.tsx)、[`orders/[id]/page.tsx`](../../apps/backoffice/src/app/(app)/orders/[id]/page.tsx) |
| 路由 `head()` meta | `export const metadata` / `generateMetadata` |
| `@tanstack/react-query` + `listOrders` mock | **服务端** [`listOrders`](../../apps/backoffice/src/lib/data/orders.ts) + URL `searchParams`；客户端仅搜索、筛选抽屉、批量操作等 |
| `src/styles.css` Token | [`apps/backoffice/src/app/globals.css`](../../apps/backoffice/src/app/globals.css) |
| `src/lib/mock/api.ts` | `lib/data/orders.ts` 等与 Supabase/后端对齐；**以代码为准**，与本文档冲突时在 [`ORDERS_FULL_EXPORT.md`](./ORDERS_FULL_EXPORT.md) 文首有说明 |

## 硬性约束优先级

若 ORDERS_SPEC 与仓库 [`.cursor/rules/*.mdc`](../../.cursor/rules/)（尤其 `00-overview`、`10-design-tokens`）冲突，以 **仓库规则 + globals.css 语义 Token** 为准；禁止在业务组件中写死 `text-white` / 任意 hex 作语义色。

## 文件索引

- [`ORDERS_SPEC.md`](./ORDERS_SPEC.md) — 业务与页面完整规范（§7 列表、§8 详情、§9 新建）
- [`ORDERS_FULL_EXPORT.md`](./ORDERS_FULL_EXPORT.md) — 文件树与导出级清单（含 TanStack 栈说明）
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — 设计系统摘要
- [`UI_CHECKLIST.md`](./UI_CHECKLIST.md) — UI PR 自检（请将「TanStack 路由」等条替换为 Next App Router 等价项）
