# 库存 / 商品管理（Inventory）

面向门店后台（backoffice）的库存台账与回收合规能力，代码主要在 `apps/backoffice` 与 `supabase/migrations`。

若部署时出现 **`Could not find the table 'public.inventory_items'`**，请在 Supabase 按文档顺序执行迁移：参见 [Vercel + Supabase 部署指南（§1.1 起）](../deploy/vercel-supabase.md)。

## 生命周期状态 `lifecycle_status`

| 值 | 含义 |
| -- | ---- |
| `draft` | 草稿（当前创建路径默认进入 `in_stock`，保留枚举兼容） |
| `in_stock` | 在库可售（视规则） |
| `reserved` | 预留 |
| `sold` | 已售出 |
| `cancelled` | 已取消 |

渠道 `product_channel`：`new_retail` · `refurbished` · `trade_in`（回收/置换）。

## 可售条件 `canSellInventory`

逻辑见 `apps/backoffice/src/lib/inventory/sellable.ts`，与详情页展示一致：回收机需完成 IMEI 核对、质检完成标记，且无有效冷冻期（`listing_hold_until` 未到）。

## 回收冷冻天数

- 环境变量 **`TRADE_IN_HOLD_DAYS`**（0–365）：全实例覆盖。
- 否则读取门店 `stores.order_ui_config` → `inventory.trade_in_hold_days`（数字，0–365）。
- 默认 **7** 天。

服务端解析：`resolveTradeInHoldDaysForStore`（`apps/backoffice/src/lib/data/inventory.ts`）。

## 附件 `inventory_attachments`

| `kind` | 说明 |
| ------ | ---- |
| `id_front` | 证件正面 |
| `id_back` | 证件反面 |
| `invoice` | 发票 / 票据 |
| `box` | 包装 / 附件 |
| `other` | 其他 |

文件存放在 Supabase Storage 私有桶 **`inventory-docs`**；服务端生成短时签名 URL。

### 证件预览与角色

未实现登录角色的完整 RBAC；通过环境变量区分：

- **`BACKOFFICE_INVENTORY_DOC_ROLE=manager`**：可为证件类附件生成签名 URL。
- 其他值或未设置：前台账号不生成证件图链接（界面提示占位）。

## 幂等入库 `POST /api/inventory`

请求头 **`Idempotency-Key`**（可选，最长 128 字符）：同一门店、同一 key 重复提交返回首次创建的 `id` / `publicNo`，响应体含 `idempotentReplay: true` 时 HTTP **200**（与首次 **201** 区分）。

映射表：`inventory_create_idempotency`（`store_id` + `idempotency_key`）。

## 协议打印（回收）

意大利语文本模板见 `TradeInAgreementPrintSheet`，法律版本常量 **`TRADE_IN_AGREEMENT_LEGAL_VERSION`**（与 `inventory-print-it.ts` / 打印审计事件一致）。打印动作写入 `inventory_events`，类型 `print_trade_in_agreement`。

## 相关 API（节选）

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/api/inventory` | 列表筛选 |
| POST | `/api/inventory` | 新建；支持 `Idempotency-Key` |
| GET/PATCH | `/api/inventory/[id]` | 详情 / 更新 |
| POST | `/api/inventory/[id]/transition` | 状态流转 |
| GET/POST | `/api/inventory/[id]/attachments` | 附件列表 / 上传 |
| POST | `/api/inventory/[id]/print-log` | 回收协议打印审计 |
| GET | `/api/inventory/export` | CSV 导出 |
