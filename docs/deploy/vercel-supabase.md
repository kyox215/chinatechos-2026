# Vercel + Supabase 部署对接指南（backoffice）

## 1) Supabase：建库与表结构

1. 在 Supabase 创建项目（Postgres）
2. 打开 SQL Editor，执行 [schema.sql](file:///Users/kyox215/Desktop/ChinaTechOS%20050526/supabase/schema.sql)
3. 创建一个门店（stores 表）并记下它的 `id`（作为 DEFAULT_STORE_ID）

## 2) 本地：配置环境变量并验证

在 `apps/backoffice` 下复制环境变量模板：

- 参考文件：[.env.example](file:///Users/kyox215/Desktop/ChinaTechOS%20050526/apps/backoffice/.env.example)

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
