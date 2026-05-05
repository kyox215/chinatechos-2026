import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export default function AppLayout(props: { children: ReactNode }) {
  return <AppShell>{props.children}</AppShell>;
}
