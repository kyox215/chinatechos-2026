"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  IconClipboardList,
  IconCubes,
  IconMessage,
  IconSettings,
  IconStore,
  IconUsers,
  IconWrench,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const items: NavItem[] = [
  { href: "/dashboard", label: "概览", icon: IconWrench },
  { href: "/orders", label: "工单", icon: IconClipboardList },
  { href: "/customers", label: "客户", icon: IconUsers },
  { href: "/inventory", label: "库存", icon: IconCubes },
  { href: "/messages/templates", label: "消息模板", icon: IconMessage },
  { href: "/messages/logs", label: "消息记录", icon: IconMessage },
  { href: "/settings/suppliers", label: "供应商", icon: IconStore },
  { href: "/settings", label: "设置", icon: IconSettings },
];

const bottomNavHrefs = new Set([
  "/dashboard",
  "/orders",
  "/customers",
  "/inventory",
  "/messages/templates",
]);

export function Nav(props: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((it) => (
        <NavLink
          key={it.href}
          active={isActivePath(pathname, it.href)}
          collapsed={Boolean(props.collapsed)}
          href={it.href}
          icon={it.icon}
          label={it.label}
          onClick={props.onNavigate}
        />
      ))}
    </nav>
  );
}

function NavLink(props: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = props.icon;
  return (
    <div className="group relative">
      <Link
        className={[
          "group/nav relative flex min-h-11 items-center rounded-2xl px-3 py-2 text-sm transition-colors md:min-h-10",
          props.collapsed ? "justify-center gap-0" : "gap-3",
          props.active ? "bg-primary-2 text-foreground shadow-sm" : "text-neutral-700 hover:bg-muted",
        ].join(" ")}
        href={props.href}
        onClick={props.onClick}
        title={props.collapsed ? props.label : undefined}
      >
        {props.active && !props.collapsed ? (
          <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#8b7cf6] to-[#24d6d8]" />
        ) : null}
        <Icon className={["h-5 w-5 shrink-0", props.active ? "text-primary" : "text-neutral-700"].join(" ")} />
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

export function MobileBottomNav() {
  const pathname = usePathname();
  const bottomItems = items.filter((it) => bottomNavHrefs.has(it.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/92 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(40,89,120,0.10)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {bottomItems.map((it) => {
          const active = isActivePath(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              className="flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium text-neutral-500"
              href={it.href}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-2xl transition-colors",
                  active ? "bg-primary-2 text-primary" : "text-neutral-500",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className={active ? "text-foreground" : ""}>{it.label.replace("消息模板", "消息")}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/settings") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
