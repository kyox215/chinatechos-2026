"use client";

export function TopBar(props: {
  onMenuClick: () => void;
  onToggleDesktopSidebar: () => void;
  mobileSidebarOpen: boolean;
  sidebarCollapsed: boolean;
  storeCode?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 md:px-4">
      <button
        aria-label="打开菜单"
        aria-expanded={props.mobileSidebarOpen}
        className="ui-btn ui-btn-secondary h-10 w-10 shrink-0 text-lg text-neutral-700 md:hidden"
        onClick={props.onMenuClick}
        type="button"
      >
        ☰
      </button>
      <button
        className="ui-btn ui-btn-secondary hidden h-9 w-9 shrink-0 text-sm text-neutral-700 md:flex md:items-center md:justify-center"
        onClick={props.onToggleDesktopSidebar}
        type="button"
      >
        {props.sidebarCollapsed ? "▸" : "◂"}
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-neutral-900">ChinaTechOS</span>
        {props.storeCode ? (
          <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            {props.storeCode}
          </span>
        ) : null}
      </div>
    </div>
  );
}
