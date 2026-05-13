import type { Metadata } from "next";
import { InventoryList } from "@/components/inventory/InventoryList";
import { InventoryListToolbar } from "@/components/inventory/InventoryListToolbar";
import { listInventoryItems } from "@/lib/data/inventory";

export const metadata: Metadata = {
  title: "商品管理 — ChinaTechOS",
  description: "管理库存商品、筛选与搜索",
};

type QueryValue = string | string[] | undefined;

async function resolveSearchParamsRecord(
  sp: Promise<Record<string, QueryValue>> | Record<string, QueryValue> | undefined,
): Promise<Record<string, QueryValue>> {
  if (sp == null) return {};
  if (typeof (sp as Promise<Record<string, QueryValue>>).then === "function") {
    return (await sp) ?? {};
  }
  return sp as Record<string, QueryValue>;
}

export default async function InventoryPage(props: {
  searchParams?: Promise<Record<string, QueryValue>> | Record<string, QueryValue>;
}) {
  const searchParams = await resolveSearchParamsRecord(props.searchParams);
  const q = normalizeQuery(searchParams.q);
  const channel = normalizeQuery(searchParams.channel) ?? "all";
  const status = normalizeQuery(searchParams.status) ?? "all";
  const dateFrom = normalizeQuery(searchParams.dateFrom);
  const dateTo = normalizeQuery(searchParams.dateTo);

  const { items, error: listError } = await listInventoryItems({ q, channel, status, dateFrom, dateTo });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      {listError ? (
        <div className="rounded-2xl border border-border bg-status-warn px-4 py-3 text-sm text-status-warn-foreground">
          <p className="font-medium">库存列表暂时无法加载</p>
          <p className="mt-1 font-mono text-xs opacity-90">{listError}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            请确认已在 Supabase 执行库存相关迁移、环境变量已配置{" "}
            <code className="rounded bg-card px-1">NEXT_PUBLIC_SUPABASE_URL</code> 与{" "}
            <code className="rounded bg-card px-1">SUPABASE_SERVICE_ROLE_KEY</code>（或{" "}
            <code className="rounded bg-card px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            ）、以及 <code className="rounded bg-card px-1">DEFAULT_STORE_ID</code>（若未设置则需 Service Role 能读到门店表）。
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-xl font-semibold tracking-tight">商品管理</h1>
        <InventoryListToolbar
          channel={channel}
          dateFrom={dateFrom}
          dateTo={dateTo}
          q={q}
          status={status}
        />
      </div>

      <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" method="get">
        <input
          className="ui-input h-10 w-full sm:max-w-xs md:h-9"
          defaultValue={q ?? ""}
          name="q"
          placeholder="搜索编号 / 品牌 / IMEI"
          type="search"
        />
        <select className="ui-input h-10 w-full sm:w-40 md:h-9" defaultValue={channel} name="channel">
          <option value="all">全部渠道</option>
          <option value="new_retail">新机</option>
          <option value="refurbished">翻新</option>
          <option value="trade_in">回收</option>
        </select>
        <select className="ui-input h-10 w-full sm:w-36 md:h-9" defaultValue={status} name="status">
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="in_stock">在库</option>
          <option value="reserved">预留</option>
          <option value="sold">已售</option>
          <option value="cancelled">已取消</option>
        </select>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
          <input
            className="ui-input h-10 w-full md:h-9"
            defaultValue={dateFrom ?? ""}
            name="dateFrom"
            placeholder="创建起 yyyy-mm-dd"
            type="date"
          />
          <input
            className="ui-input h-10 w-full md:h-9"
            defaultValue={dateTo ?? ""}
            name="dateTo"
            placeholder="创建止 yyyy-mm-dd"
            type="date"
          />
        </div>
        <button className="ui-btn ui-btn-secondary h-10 px-4 text-xs md:h-9" type="submit">
          筛选
        </button>
      </form>

      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">共 <span className="font-mono tabular-nums">{items.length}</span> 条</span>
      </div>

      {items.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">
          暂无库存记录。点击「新建入库」添加。
        </div>
      ) : (
        <InventoryList items={items} />
      )}
    </div>
  );
}

function normalizeQuery(value: QueryValue): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
