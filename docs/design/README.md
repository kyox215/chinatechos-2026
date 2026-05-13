# 通用设计参考（RepairDesk kit 摘录）

本目录中的 Markdown 从本地 **`repairdesk-replication-kit.zip`**（TanStack Start 全栈示例）内 **`docs/`** 摘录，仅作 **色彩与 UI 层级** 的补充说明，**不**代表本仓库的实现栈或文件路径。

## 权威优先级

1. **Token 与语义色** — [`apps/backoffice/src/app/globals.css`](../../apps/backoffice/src/app/globals.css) 为唯一来源。  
2. **规则** — [`.cursor/rules/10-design-tokens.mdc`](../../.cursor/rules/10-design-tokens.mdc) 等 `.cursor/rules/*.mdc`。  
3. **本文档** — 若与上述冲突，以 **globals + `.mdc`** 为准；不得用本文档中的路径或 TanStack 约定覆盖 Next 实现。

## 文件

| 文件 | 说明 |
|------|------|
| [COLOR_DESIGN_SPEC.md](./COLOR_DESIGN_SPEC.md) | 色彩与对比度相关规范（摘录） |
| [UI_DESIGN_MASTER.md](./UI_DESIGN_MASTER.md) | UI 主规范与组件层级（摘录） |

工单业务与列表/详情规范仍以 [`docs/orders/`](../orders/) 为准。
