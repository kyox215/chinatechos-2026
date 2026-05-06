export function TopBar(props: {
  onMenuClick: () => void;
  onToggleDesktopSidebar: () => void;
  mobileSidebarOpen: boolean;
  sidebarCollapsed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-3 py-3 md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="打开菜单"
          aria-expanded={props.mobileSidebarOpen}
          className="ui-btn ui-btn-secondary h-10 w-10 text-lg text-neutral-700 md:hidden"
          onClick={props.onMenuClick}
          type="button"
        >
          ☰
        </button>
        <button
          className="ui-btn ui-btn-secondary hidden h-9 w-9 text-sm text-neutral-700 md:block"
          onClick={props.onToggleDesktopSidebar}
          type="button"
        >
          {props.sidebarCollapsed ? "▸" : "◂"}
        </button>
        <div className="relative w-full max-w-[58vw] md:w-[320px]">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
            <span className="text-xs">⌕</span>
          </div>
          <input
            className="ui-input w-full pl-8 pr-3"
            placeholder="搜索：电话 / 工单号 / IMEI / 型号"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="ui-btn ui-btn-secondary h-10 px-3 font-medium text-neutral-800 md:h-9">
          新建工单
        </button>
        <div className="hidden h-9 w-9 rounded-xl border border-border bg-surface md:block" />
      </div>
    </div>
  );
}
