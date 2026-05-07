import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { OrderUiProvider } from "@/components/order-ui/OrderUiProvider";
import { defaultResolvedOrderUi, resolvedOrderUiToJson } from "@/lib/domain/order-ui-config";
import { getStoreSettings } from "@/lib/data/store-settings";

export default async function AppLayout(props: { children: ReactNode }) {
  const settings = await getStoreSettings();
  const orderUiJson = resolvedOrderUiToJson(settings?.resolvedOrderUi ?? defaultResolvedOrderUi());
  return (
    <OrderUiProvider value={orderUiJson}>
      <AppShell storeCode={settings?.storeCode ?? ""}>
        {props.children}
      </AppShell>
    </OrderUiProvider>
  );
}
