# Vercel + Supabase 部署对接指南（backoffice）

## 1) Supabase：建库与表结构

1. 在 Supabase 创建项目（Postgres）
2. 打开 SQL Editor，执行仓库根目录下的全量快照 [`supabase/schema.sql`](../../supabase/schema.sql)（新建环境推荐）
3. 创建一个门店（stores 表）并记下它的 `id`（作为 DEFAULT_STORE_ID）

### 1.1 商品管理报错：`Could not find the table 'public.inventory_items'`

含义：当前应用连接的 Supabase **项目里还没有库存相关表**（常见于上线较早的环境只跑过旧 schema，或连错了项目）。

**做法（任选其一）：**

**A. 一键脚本（推荐）** — 在 **SQL Editor** 中打开并 **整段执行**（单次 Run）：

- [`docs/deploy/apply-inventory-tables-supabase.sql`](apply-inventory-tables-supabase.sql)（已合并上述三份 migration，可直接复制文件全文）

**B. 增量迁移（需分段执行时）** — 按下面顺序 **分别执行** 每个文件的 **全文**（复制自本仓库）：

| 顺序 | 文件 |
|------|------|
| 1 | [`supabase/migrations/20260507120000_inventory_items.sql`](../../supabase/migrations/20260507120000_inventory_items.sql) |
| 2 | [`supabase/migrations/20260508140000_inventory_attachments.sql`](../../supabase/migrations/20260508140000_inventory_attachments.sql) |
| 3 | [`supabase/migrations/20260508150000_inventory_create_idempotency.sql`](../../supabase/migrations/20260508150000_inventory_create_idempotency.sql) |

执行后在 **Table Editor** 中确认存在表 **`inventory_items`**，然后刷新 Backoffice「商品管理」页。若极少数情况下仍提示 schema cache，可在 Dashboard 重启项目或等待数秒再试。

**C. Supabase CLI**（本地已 `supabase link` 到目标项目时）：

```bash
cd /path/to/repo
supabase db push
```

需保证远程迁移历史与仓库一致。

### 1.2 环境变量与 Supabase 项目必须一致

库存 API 使用服务端 Supabase 客户端；以下变量必须来自 **同一 Supabase 项目**（Dashboard → Project Settings → API）：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role（仅服务端，勿暴露到浏览器） |
| `DEFAULT_STORE_ID`（可选） | `stores.id`（UUID）；不填时需 Service Role 能读取 `stores` 表以解析默认门店 |

若本地正常、线上仍报缺表，检查 **Vercel（或其它托管）环境变量** 是否指向 **已执行迁移** 的同一项目。

### 1.3 验收（商品管理）

1. Supabase **Table Editor** 中存在 **`inventory_items`**（以及按需存在的 `inventory_attachments`、`inventory_create_idempotency`）。
2. Backoffice 打开 `/inventory`，顶部不再出现「Could not find the table …」类提示，列表可加载（无记录时为 0 条属正常）。

## 2) 本地：配置环境变量并验证

在 `apps/backoffice` 下复制环境变量模板：

- 参考文件：[`apps/backoffice/.env.example`](../../apps/backoffice/.env.example)

需要填写：
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY（仅服务端使用，不要加 NEXT_PUBLIC 前缀）
- DEFAULT_STORE_ID（stores.id）

启动：

```bash
cd "/Users/kyox215/Desktop/ChinaTechOS 050526"
./scripts/backoffice-install-node.sh
./scripts/backoffice-dev.sh
```

验证：
- http://localhost:3100/dashboard
- http://localhost:3100/orders

## 3) Vercel：绑定项目

推荐方式：Vercel Dashboard 导入 Git 仓库

1. Vercel → Add New → Project → Import
2. Root Directory 选择 `apps/backoffice`
3. Environment Variables 填入与本地一致的 4 个变量：
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - DEFAULT_STORE_ID
4. Deploy

## 4) 安全注意

- SUPABASE_SERVICE_ROLE_KEY 只能放在 Vercel 的 Server 环境变量里，禁止暴露到浏览器端
- 当前阶段未接入“登录/门店上下文 JWT”，RLS 策略按 `store_id` claim 设计；正式上线前需完成鉴权与会话方案
