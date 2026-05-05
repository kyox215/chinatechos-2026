import { Nav } from "@/components/Nav";

export function Sidebar() {
  return (
    <aside className="flex h-[calc(100dvh-24px)] flex-col gap-4 rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/15" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">ChinaTechOS</div>
            <div className="truncate text-xs text-neutral-500">后台 MVP</div>
          </div>
        </div>
        <div className="h-8 w-8 rounded-xl border border-border bg-surface-2" />
      </div>

      <div className="px-2">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2">
          <div className="h-7 w-7 rounded-lg bg-muted" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">当前门店</div>
            <div className="truncate text-xs text-neutral-500">MI</div>
          </div>
        </div>
      </div>

      <div className="px-2">
        <div className="text-xs font-semibold text-neutral-500">主菜单</div>
      </div>
      <div className="px-1">
        <Nav />
      </div>

      <div className="mt-auto rounded-xl border border-border bg-surface-2 p-3">
        <div className="text-xs font-semibold text-neutral-700">提示</div>
        <div className="mt-1 text-xs text-neutral-500">
          优先：快速搜索、快速操作、状态清晰、信息可追溯。
        </div>
      </div>
    </aside>
  );
}
