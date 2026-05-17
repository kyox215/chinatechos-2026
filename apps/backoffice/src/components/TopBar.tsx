"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthControls } from "@/components/auth/AuthControls";
import {
  IconBell,
  IconChevronDown,
  IconChevronUp,
  IconMenu,
  IconMoon,
  IconPlus,
} from "@/components/icons";

export function TopBar(props: {
  onMenuClick: () => void;
  onToggleDesktopSidebar: () => void;
  mobileSidebarOpen: boolean;
  sidebarCollapsed: boolean;
  storeCode?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getRouteTitle(pathname);

  function handlePrimaryAction() {
    if (pathname.startsWith("/orders")) {
      window.dispatchEvent(new Event("orders:create"));
      return;
    }
    if (pathname.startsWith("/inventory")) router.push("/inventory/new");
    else if (pathname.startsWith("/customers")) router.push("/customers/new");
    else router.push("/orders");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/82 px-4 py-3 backdrop-blur-xl md:static md:rounded-[1.5rem] md:border md:bg-surface/80 md:px-4 md:py-3 md:shadow-sm">
      <div className="flex items-center gap-3">
        <button
          aria-label="打开菜单"
          aria-expanded={props.mobileSidebarOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-neutral-900 transition-colors hover:bg-muted md:hidden"
          onClick={props.onMenuClick}
          type="button"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <button
          aria-label={props.sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          className="ui-btn ui-btn-secondary hidden h-9 w-9 shrink-0 items-center justify-center p-0 text-neutral-700 md:flex"
          onClick={props.onToggleDesktopSidebar}
          type="button"
        >
          {props.sidebarCollapsed ? (
            <IconChevronDown className="h-4 w-4 -rotate-90" />
          ) : (
            <IconChevronUp className="h-4 w-4 -rotate-90" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-neutral-500">
            <span className="truncate">首页</span>
            <span className="text-neutral-300">/</span>
            <span className="truncate text-neutral-950">{title}</span>
          </div>
          {props.storeCode ? (
            <div className="mt-0.5 hidden text-xs text-neutral-500 md:block">当前门店 {props.storeCode}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="切换深色模式"
            className="hidden h-10 w-10 items-center justify-center rounded-2xl text-neutral-900 transition-colors hover:bg-muted sm:flex"
            type="button"
          >
            <IconMoon className="h-5 w-5" />
          </button>
          <button
            aria-label="通知"
            className="hidden h-10 w-10 items-center justify-center rounded-2xl text-neutral-900 transition-colors hover:bg-muted sm:flex"
            type="button"
          >
            <IconBell className="h-5 w-5" />
          </button>
          <button
            aria-label="新建"
            className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-[#8b7cf6] to-[#22cfe0] text-white shadow-[0_10px_24px_rgba(79,70,229,0.30)] transition-transform active:scale-95 md:h-10 md:w-10"
            onClick={handlePrimaryAction}
            type="button"
          >
            <IconPlus className="h-5 w-5" />
          </button>
          <div className="hidden md:block">
            <AuthControls />
          </div>
        </div>
      </div>
    </header>
  );
}

function getRouteTitle(pathname: string) {
  if (pathname.startsWith("/orders")) return "工单";
  if (pathname.startsWith("/customers")) return "客户";
  if (pathname.startsWith("/inventory")) return "库存";
  if (pathname.startsWith("/messages")) return "消息";
  if (pathname.startsWith("/settings")) return "设置";
  return "概览";
}
