import { Nav } from "@/components/Nav";
import { X } from "lucide-react";

export function Sidebar(props: {
  collapsed?: boolean;
  mobile?: boolean;
  onCloseMobile?: () => void;
}) {
  const collapsed = Boolean(props.collapsed) && !props.mobile;
  return (
    <aside className="flex h-full min-h-[calc(100dvh-24px)] flex-col gap-4 rounded-2xl border border-border bg-sidebar p-3">
      <div className={["flex items-center px-2 pt-1", collapsed ? "justify-center" : "justify-between"].join(" ")}>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            CT
          </div>
          <div className={["min-w-0", collapsed ? "hidden" : ""].join(" ")}>
            <div className="truncate text-sm font-semibold text-sidebar-foreground">ChinaTechOS</div>
            <div className="truncate text-xs text-muted-foreground">维修后台</div>
          </div>
        </div>
        {props.mobile ? (
          <button
            aria-label="关闭菜单"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={props.onCloseMobile}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="px-2">
        <div className={["flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2", collapsed ? "justify-center" : ""].join(" ")}>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            MI
          </div>
          <div className={["min-w-0", collapsed ? "hidden" : ""].join(" ")}>
            <div className="truncate text-sm font-medium text-sidebar-foreground">当前门店</div>
            <div className="truncate text-xs text-muted-foreground">Milan</div>
          </div>
        </div>
      </div>

      <div className={["px-2", collapsed ? "hidden" : ""].join(" ")}>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">主菜单</div>
      </div>
      <div className="flex-1 px-1">
        <Nav collapsed={collapsed} onNavigate={props.mobile ? props.onCloseMobile : undefined} />
      </div>

      <div className={["rounded-lg border border-border bg-surface p-3", collapsed ? "hidden" : ""].join(" ")}>
        <div className="text-xs font-semibold text-sidebar-foreground">提示</div>
        <div className="mt-1 text-xs text-muted-foreground">
          按 <kbd className="rounded border border-border bg-sidebar px-1 py-0.5 text-[10px]">⌘K</kbd> 快速搜索页面。
        </div>
      </div>
    </aside>
  );
}
