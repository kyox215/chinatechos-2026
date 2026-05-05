import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export function AppShell(props: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[280px_1fr] gap-5 px-6 py-6">
        <Sidebar />
        <div className="flex min-w-0 flex-col gap-4">
          <TopBar />
          <main className="min-w-0 rounded-2xl border border-border bg-surface p-6">
            {props.children}
          </main>
        </div>
      </div>
    </div>
  );
}
