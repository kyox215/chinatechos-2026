#!/usr/bin/env bash
# 在本机用 psql 依次执行库存相关 SQL（避免 IDE prepared statement 限制）。
#
# 前置：
#   - 已安装 psql（macOS: brew install libpq && brew link --force libpq）
#   - 数据库已具备 stores / customers / repair_orders / current_store_id()（可先执行 supabase/schema.sql）
#
# 用法 A — 本地 Supabase（推荐开发）：
#   在项目根目录：
#     supabase start
#   查看连接串（任选其一）：
#     supabase status
#   设置直连 Postgres（端口见 supabase/config.toml 里 [db] port，默认 54322）：
#     export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
#   若默认密码不对，以 `supabase status` 或 Dashboard 本地输出为准。
#
# 用法 B — 云端 Supabase：
#   Dashboard → Project Settings → Database → URI（建议 Session mode 或直连）
#     export DATABASE_URL='postgresql://postgres.xxx:YOUR_PASSWORD@...'
#
# 执行：
#   ./scripts/apply-inventory-migrations-local.sh
#
# 也可覆盖脚本使用的 SQL 目录（默认使用仓库内 migration 文件）：
#   USE_DOCS_PARTS=1 ./scripts/apply-inventory-migrations-local.sh
#   将改用 docs/deploy/apply-inventory-tables-part{1,2,3}*.sql（与分段文档一致）

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "请先设置 DATABASE_URL（Postgres 连接串），例如：" >&2
  echo "  export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'" >&2
  echo "本地请先运行: supabase start，并用 supabase status 核对端口与密码。" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "未找到 psql。macOS 可执行: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

if [[ "${USE_DOCS_PARTS:-}" == "1" ]]; then
  FILES=(
    "$ROOT/docs/deploy/apply-inventory-tables-part1-items-and-events.sql"
    "$ROOT/docs/deploy/apply-inventory-tables-part2-attachments.sql"
    "$ROOT/docs/deploy/apply-inventory-tables-part3-idempotency.sql"
  )
else
  FILES=(
    "$ROOT/supabase/migrations/20260507120000_inventory_items.sql"
    "$ROOT/supabase/migrations/20260508140000_inventory_attachments.sql"
    "$ROOT/supabase/migrations/20260508150000_inventory_create_idempotency.sql"
  )
fi

for sql in "${FILES[@]}"; do
  if [[ ! -f "$sql" ]]; then
    echo "缺少文件: $sql" >&2
    exit 1
  fi
  echo ">>> Applying: $sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$sql"
done

echo ""
echo "完成。可在库里检查: SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'inventory%';"
