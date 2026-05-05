export function TopBar() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden text-sm font-semibold text-neutral-900 md:block">欢迎回来</div>
        <div className="relative w-[320px] max-w-[56vw]">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
            <span className="text-xs">⌕</span>
          </div>
          <input
            className="h-9 w-full rounded-xl border border-border bg-surface-2 pl-8 pr-3 text-sm outline-none ring-0 focus:border-primary/40 focus:shadow-[0_0_0_4px_var(--color-ring)]"
            placeholder="搜索：电话 / 工单号 / IMEI / 型号"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="h-9 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-neutral-800 hover:bg-muted">
          新建工单
        </button>
        <div className="h-9 w-9 rounded-xl border border-border bg-surface" />
      </div>
    </div>
  );
}
