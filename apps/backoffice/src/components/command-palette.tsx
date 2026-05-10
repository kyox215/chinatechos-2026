"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  Settings,
  MessageSquare,
  Truck,
  Search,
} from "lucide-react";

interface RouteEntry {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords?: string[];
}

const routes: RouteEntry[] = [
  { label: "仪表盘", href: "/dashboard", icon: LayoutDashboard, keywords: ["dashboard", "首页", "概览"] },
  { label: "工单", href: "/orders", icon: ClipboardList, keywords: ["orders", "维修", "工单"] },
  { label: "客户", href: "/customers", icon: Users, keywords: ["customers", "客户"] },
  { label: "库存", href: "/inventory", icon: Package, keywords: ["inventory", "库存", "配件"] },
  { label: "设置", href: "/settings", icon: Settings, keywords: ["settings", "设置"] },
  { label: "供应商", href: "/settings/suppliers", icon: Truck, keywords: ["suppliers", "供应商"] },
  { label: "发送记录", href: "/messages/logs", icon: MessageSquare, keywords: ["messages", "消息", "发送"] },
  { label: "消息模板", href: "/messages/templates", icon: MessageSquare, keywords: ["templates", "模板"] },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = routes.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.label.toLowerCase().includes(q) ||
      r.href.toLowerCase().includes(q) ||
      r.keywords?.some((k) => k.includes(q))
    );
  });

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(href);
    },
    [onOpenChange, router],
  );

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-x-0 top-[20%] z-50 mx-auto w-full max-w-lg px-4">
        <div className="glass-strong overflow-hidden rounded-2xl p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索页面…"
              value={query}
            />
            <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-muted-foreground">
              Esc
            </kbd>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                无匹配结果
              </div>
            ) : (
              filtered.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
                    key={r.href}
                    onClick={() => handleSelect(r.href)}
                    type="button"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{r.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{r.href}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
