"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "工单" },
  { href: "/customers", label: "客户" },
  { href: "/messages/templates", label: "消息中心 · 模板" },
  { href: "/messages/logs", label: "消息中心 · 记录" },
  { href: "/settings/suppliers", label: "供应商" },
  { href: "/settings", label: "设置" },
];

export function Nav(props: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => (
        <NavLink
          key={it.href}
          href={it.href}
          label={it.label}
          active={pathname === it.href || pathname.startsWith(`${it.href}/`)}
          collapsed={Boolean(props.collapsed)}
          onClick={props.onNavigate}
        />
      ))}
    </nav>
  );
}

function NavLink(props: {
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="group relative">
      <Link
        className={[
          "group/nav flex items-center rounded-xl px-3 py-2 text-sm transition-colors",
          props.collapsed ? "justify-center gap-0" : "gap-2",
          props.active
            ? "bg-primary-2 text-foreground ring-1 ring-primary/20"
            : "text-neutral-700 hover:bg-muted",
        ].join(" ")}
        href={props.href}
        onClick={props.onClick}
        title={props.collapsed ? props.label : undefined}
      >
        <span
          className={[
            "h-2 w-2 rounded-full transition-colors",
            props.active ? "bg-primary" : "bg-neutral-300 group-hover/nav:bg-neutral-400",
          ].join(" ")}
        />
        <span className={["font-medium", props.collapsed ? "hidden" : ""].join(" ")}>{props.label}</span>
      </Link>
      {props.collapsed ? (
        <div className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-neutral-700 shadow-sm group-hover:block">
          {props.label}
        </div>
      ) : null}
    </div>
  );
}
