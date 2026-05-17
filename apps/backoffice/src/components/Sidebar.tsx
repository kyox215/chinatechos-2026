import { IconStore, IconWrench, IconXMark } from "@/components/icons";
import { Nav } from "@/components/Nav";

export function Sidebar(props: {
  collapsed?: boolean;
  mobile?: boolean;
  onCloseMobile?: () => void;
}) {
  const collapsed = Boolean(props.collapsed) && !props.mobile;
  return (
    <aside
      className={[
        "flex h-full min-h-dvh flex-col bg-surface shadow-sm",
        props.mobile
          ? "border-r border-border"
          : "rounded-[1.5rem] border border-border bg-surface/82 p-3 backdrop-blur-xl",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center border-b border-border px-5 py-5",
          collapsed ? "justify-center md:border-b-0 md:px-2 md:py-2" : "justify-between",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b7cf6] to-[#22cfe0] text-white shadow-[0_10px_24px_rgba(35,207,224,0.26)]">
            <IconWrench className="h-5 w-5" />
          </div>
          <div className={["min-w-0", collapsed ? "hidden" : ""].join(" ")}>
            <div className="truncate text-base font-semibold text-neutral-950">RepairDesk</div>
            <div className="truncate text-xs text-neutral-500">维修工单后台</div>
          </div>
        </div>
        {props.mobile ? (
          <button
            aria-label="关闭菜单"
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-neutral-600 transition-colors hover:bg-muted"
            onClick={props.onCloseMobile}
            type="button"
          >
            <IconXMark className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className={["px-5 pt-7", collapsed ? "hidden" : ""].join(" ")}>
        <div className="text-xs font-medium text-neutral-400">主导航</div>
      </div>
      <div className={["pt-4", props.mobile ? "px-3" : "px-1", collapsed ? "px-0" : ""].join(" ")}>
        <Nav collapsed={collapsed} onNavigate={props.mobile ? props.onCloseMobile : undefined} />
      </div>

      <div className={["mt-auto border-t border-border p-4", collapsed ? "hidden" : ""].join(" ")}>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-2 text-primary">
            <IconStore className="h-5 w-5" />
            <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-[#24d6a5]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-neutral-950">华强北旗舰店</div>
            <div className="truncate text-xs text-neutral-500">SZ-001 · 在线</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
