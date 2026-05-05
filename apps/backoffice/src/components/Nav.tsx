"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "工单" },
  { href: "/customers", label: "客户" },
  { href: "/messages/templates", label: "消息模板" },
  { href: "/messages/logs", label: "发送记录" },
  { href: "/settings", label: "设置" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => (
        <NavLink
          key={it.href}
          href={it.href}
          label={it.label}
          active={pathname === it.href || pathname.startsWith(`${it.href}/`)}
        />
      ))}
    </nav>
  );
}

function NavLink(props: { href: string; label: string; active: boolean }) {
  return (
    <Link
      className={[
        "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
        props.active
          ? "bg-primary-2 text-foreground"
          : "text-neutral-700 hover:bg-muted",
      ].join(" ")}
      href={props.href}
    >
      <span
        className={[
          "h-2 w-2 rounded-full transition-colors",
          props.active ? "bg-primary" : "bg-neutral-300 group-hover:bg-neutral-400",
        ].join(" ")}
      />
      <span className="font-medium">{props.label}</span>
    </Link>
  );
}
