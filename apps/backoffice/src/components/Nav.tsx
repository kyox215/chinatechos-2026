"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Users,
  MessageSquare,
  Truck,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

const items: NavItem[] = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/orders", label: "工单", icon: ClipboardList },
  { href: "/inventory", label: "商品管理", icon: Package },
  { href: "/customers", label: "客户", icon: Users },
  { href: "/messages/templates", label: "消息模板", icon: MessageSquare },
  { href: "/messages/logs", label: "发送记录", icon: MessageSquare },
  { href: "/settings/suppliers", label: "供应商", icon: Truck },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Nav(props: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active =
          it.href === "/settings"
            ? pathname === "/settings"
            : pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <NavLink
            key={it.href}
            href={it.href}
            label={it.label}
            icon={it.icon}
            active={active}
            collapsed={Boolean(props.collapsed)}
            onClick={props.onNavigate}
          />
        );
      })}
    </nav>
  );
}

function NavLink(props: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = props.icon;
  return (
    <div className="group relative">
      <Link
        className={[
          "group/nav relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
          props.collapsed ? "justify-center gap-0" : "gap-3",
          props.active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        ].join(" ")}
        href={props.href}
        onClick={props.onClick}
        title={props.collapsed ? props.label : undefined}
      >
        {props.active && (
          <span
            className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full"
            style={{ background: "var(--gradient-brand)" }}
          />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        <span className={["font-medium", props.collapsed ? "hidden" : ""].join(" ")}>
          {props.label}
        </span>
      </Link>
      {props.collapsed ? (
        <div className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-lg group-hover:block">
          {props.label}
        </div>
      ) : null}
    </div>
  );
}
