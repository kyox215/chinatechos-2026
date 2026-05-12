import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { OrderUiProvider } from "@/components/order-ui/OrderUiProvider";
import { AppsDataSync } from "@/components/sync/AppsDataSync";
import { defaultResolvedOrderUi, resolvedOrderUiToJson } from "@/lib/domain/order-ui-config";
import { getStoreSettings } from "@/lib/data/store-settings";
import { getDefaultStoreId } from "@/lib/env/server";

export default async function AppLayout(props: { children: ReactNode }) {
  const settings = await getStoreSettings();
  const storeId = await getDefaultStoreId();
  const orderUiJson = resolvedOrderUiToJson(settings?.resolvedOrderUi ?? defaultResolvedOrderUi());
  return (
    <OrderUiProvider value={orderUiJson}>
      <AppsDataSync storeId={storeId} />
      <AppShell storeCode={settings?.storeCode ?? ""}>
        {props.children}
      </AppShell>
    </OrderUiProvider>
  );
}
