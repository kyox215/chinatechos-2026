import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { getStoreSettings } from "@/lib/data/store-settings";

export default async function AppLayout(props: { children: ReactNode }) {
  const settings = await getStoreSettings();
  return (
    <AppShell storeCode={settings?.storeCode ?? ""}>
      {props.children}
    </AppShell>
  );
}
