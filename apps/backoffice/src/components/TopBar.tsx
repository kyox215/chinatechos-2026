"use client";

import { usePathname } from "next/navigation";
import { Menu, PanelLeft, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthControls } from "@/components/auth/AuthControls";

const breadcrumbLabels: Record<string, string> = {
  dashboard: "仪表盘",
  orders: "工单",
  customers: "客户",
  inventory: "商品管理",
  settings: "设置",
  suppliers: "供应商",
  messages: "消息中心",
  templates: "消息模板",
  logs: "发送记录",
  new: "新建",
};

export function TopBar(props: {
  onMenuClick: () => void;
  onToggleDesktopSidebar: () => void;
  onOpenCommand: () => void;
  mobileSidebarOpen: boolean;
  sidebarCollapsed: boolean;
  storeCode?: string;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((s) => breadcrumbLabels[s] ?? s);

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-[var(--shadow-card)] md:px-4">
      <button
        aria-label="打开菜单"
        aria-expanded={props.mobileSidebarOpen}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        onClick={props.onMenuClick}
        type="button"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        aria-label={props.sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
        onClick={props.onToggleDesktopSidebar}
        type="button"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <div className="hidden items-center gap-1 text-sm sm:flex">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <span className={i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}>
              {c}
            </span>
          </span>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          aria-label="打开命令面板"
          className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={props.onOpenCommand}
          type="button"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">搜索</span>
          <kbd className="hidden rounded border border-border bg-card px-1 py-0.5 text-[10px] sm:inline">⌘K</kbd>
        </button>

        <ThemeToggle />

        {props.storeCode ? (
          <span
            className="hidden shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-primary-foreground lg:inline-block"
            style={{ background: "var(--gradient-brand)" }}
          >
            {props.storeCode}
          </span>
        ) : null}
      </div>

      <AuthControls />
    </div>
  );
}
