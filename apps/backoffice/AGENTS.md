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

## UI 设计系统

> UI 开发规范已迁移至 `.cursor/rules/*.mdc`（自动注入）和 `docs/DESIGN_SYSTEM.md`（人类阅读）。
> 新页面 / PR 自检清单见 `docs/UI_CHECKLIST.md`。
