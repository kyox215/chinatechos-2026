"use client";

import { usePathname } from "next/navigation";

export function TopBar(props: {
  onMenuClick: () => void;
  onToggleDesktopSidebar: () => void;
  mobileSidebarOpen: boolean;
  sidebarCollapsed: boolean;
}) {
  const pathname = usePathname();
  const hideOnMobileOrders = pathname === "/orders";

  return (
    <div
      className={[
        "items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-3 py-3 md:flex md:px-4",
        hideOnMobileOrders ? "hidden md:flex" : "flex",
      ].join(" ")}
    >
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
      </div>
    </div>
  );
}
