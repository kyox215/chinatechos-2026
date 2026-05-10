"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { BackgroundOrbs } from "@/components/background-orbs";
import { CommandPalette } from "@/components/command-palette";
import { RouteTransition } from "@/components/route-transition";
import { MobileSidebarContext } from "@/components/MobileSidebarContext";

export function AppShell(props: { children: ReactNode; storeCode?: string }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.add("light");
    }
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [mobileSidebarOpen]);

  const toggleMobileSidebar = () => setMobileSidebarOpen((v) => !v);

  return (
    <MobileSidebarContext.Provider
      value={{ mobileSidebarOpen, toggleMobileSidebar }}
    >
      <div className="min-h-dvh bg-background">
        <BackgroundOrbs />
        <div className="relative z-0 mx-auto w-full max-w-[1400px] px-3 py-3 md:px-5 md:py-5">
          {/* Mobile sidebar overlay */}
          <div
            aria-hidden={!mobileSidebarOpen}
            className={[
              "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-200 md:hidden",
              mobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="flex gap-4">
            {/* Mobile sidebar drawer */}
            <div
              aria-hidden={!mobileSidebarOpen}
              className={[
                "fixed inset-y-0 left-0 z-50 w-[82vw] max-w-[320px] p-3 transition-all duration-200 md:hidden",
                mobileSidebarOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-full opacity-0",
              ].join(" ")}
            >
              <Sidebar mobile onCloseMobile={() => setMobileSidebarOpen(false)} />
            </div>

            {/* Desktop sidebar */}
            <div className={["hidden md:block transition-all duration-200", sidebarCollapsed ? "w-[86px]" : "w-[280px]"].join(" ")}>
              <Sidebar collapsed={sidebarCollapsed} />
            </div>

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <TopBar
                onMenuClick={() => setMobileSidebarOpen((v) => !v)}
                onToggleDesktopSidebar={() => setSidebarCollapsed((v) => !v)}
                onOpenCommand={() => setCommandOpen(true)}
                mobileSidebarOpen={mobileSidebarOpen}
                sidebarCollapsed={sidebarCollapsed}
                storeCode={props.storeCode}
              />
              <main className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-glass)] md:p-6">
                <RouteTransition>
                  {props.children}
                </RouteTransition>
              </main>
            </div>
          </div>
        </div>

        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </MobileSidebarContext.Provider>
  );
}
