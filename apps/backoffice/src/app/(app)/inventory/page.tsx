import Link from "next/link";
import { InventoryList } from "@/components/inventory/InventoryList";
import { listInventoryItems } from "@/lib/data/inventory";

type QueryValue = string | string[] | undefined;

export default async function InventoryPage(props: {
  searchParams?: Promise<Record<string, QueryValue>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const q = normalizeQuery(searchParams.q);
  const channel = normalizeQuery(searchParams.channel) ?? "all";
  const status = normalizeQuery(searchParams.status) ?? "all";

  const { items } = await listInventoryItems({ q, channel, status });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">商品管理</h1>
        <Link className="ui-btn ui-btn-primary h-10 shrink-0 px-4 text-xs md:h-9" href="/inventory/new">
          新建入库
        </Link>
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
        <button className="ui-btn ui-btn-secondary h-10 px-4 text-xs md:h-9" type="submit">
          筛选
        </button>
      </form>

      <div className="flex items-baseline justify-between">
        <span className="text-sm text-neutral-500">共 {items.length} 条</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-2 p-8 text-center text-sm text-neutral-500">
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
