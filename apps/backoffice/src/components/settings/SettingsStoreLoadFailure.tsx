import type { StoreSettingsLoadFailureReason } from "@/lib/data/store-settings";

const DEPLOY_DOC_PATH = "docs/deploy/vercel-supabase.md";

type Props = {
  reason: StoreSettingsLoadFailureReason;
  detail?: string;
};

export function SettingsStoreLoadFailure(props: Props) {
  const { reason, detail } = props;

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-neutral-800 md:px-5">
      <div>
        <p className="font-semibold text-neutral-900">无法加载门店设置</p>
        <p className="mt-1 text-neutral-700">
          下方为常见原因与修复步骤。部署与 Supabase 对接详见仓库内{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs">{DEPLOY_DOC_PATH}</code>。
        </p>
      </div>

      {reason === "no_store_id" ? (
        <ul className="list-inside list-disc space-y-1 text-neutral-700">
          <li>
            在 <code className="text-xs">apps/backoffice/.env.local</code> 配置{" "}
            <code className="text-xs">DEFAULT_STORE_ID</code>（值为{" "}
            <code className="text-xs">stores.id</code> 的 UUID）。
          </li>
          <li>
            或在 Supabase <code className="text-xs">stores</code> 表插入至少一条门店，并配置{" "}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code>（与{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> 同属一个项目），以便自动选取第一家门店。
          </li>
        </ul>
      ) : null}

      {reason === "row_not_found" ? (
        <ul className="list-inside list-disc space-y-1 text-neutral-700">
          <li>
            <code className="text-xs">DEFAULT_STORE_ID</code> 与当前数据库中的{" "}
            <code className="text-xs">stores.id</code> 不一致，或该行已被删除。请在 Table Editor 核对后修正环境变量。
          </li>
        </ul>
      ) : null}

      {reason === "schema_mismatch" ? (
        <div className="space-y-3 text-neutral-700">
          <p>
            数据库 <code className="text-xs">stores</code> 表结构与当前应用不一致（常见缺少{" "}
            <code className="text-xs">order_ui_config</code>、<code className="text-xs">print_paper</code>{" "}
            等列）。请在 Supabase <strong>SQL Editor</strong> 按顺序执行仓库中的迁移（整文件粘贴运行）：
          </p>
          <ol className="list-inside list-decimal space-y-2 pl-1">
            <li>
              <code className="text-xs">supabase/migrations/20260508_add_order_ui_config.sql</code>（
              <code className="text-xs">order_ui_config</code>）
            </li>
            <li>
              <code className="text-xs">supabase/migrations/20260507_add_store_print_defaults.sql</code>（打印相关列）
            </li>
          </ol>
          <p>
            若为<strong>新建库</strong>，也可一次性执行根目录 <code className="text-xs">supabase/schema.sql</code>。
          </p>
          <p className="text-neutral-600">
            若报错信息仅提及 <code className="text-xs">order_ui_config</code>，可先单独执行：
          </p>
          <p className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-neutral-800">
            alter table public.stores add column if not exists order_ui_config jsonb;
          </p>
        </div>
      ) : null}

      {reason === "supabase_error" ? (
        <p className="text-neutral-700">
          查询 stores 时发生其他错误。请确认环境变量指向正确的 Supabase 项目，且网络可达。
        </p>
      ) : null}

      {detail ? (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-neutral-600">
          {detail}
        </p>
      ) : null}

      <p className="text-xs text-neutral-600">
        提示：其他页面可能仍使用默认工单 UI（见应用布局兜底）；修复门店加载后，此处表单与工单 UI 高级设置将恢复完整功能。
      </p>
    </div>
  );
}
