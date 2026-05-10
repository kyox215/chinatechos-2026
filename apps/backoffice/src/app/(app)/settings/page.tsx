import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { ImportSection } from "@/components/settings/ImportSection";
import { ExportSection } from "@/components/settings/ExportSection";
import { OrderUiSettingsSection } from "@/components/settings/OrderUiSettingsSection";
import { SettingsStoreLoadFailure } from "@/components/settings/SettingsStoreLoadFailure";
import { getStoreSettingsLoadResult } from "@/lib/data/store-settings";

export const metadata: Metadata = {
  title: "设置 — ChinaTechOS",
  description: "管理门店信息、自动化参数与系统选项",
};

export default async function SettingsPage() {
  const load = await getStoreSettingsLoadResult();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">设置</h1>
        <div className="mt-1 text-sm text-muted-foreground">管理门店信息、自动化参数与系统选项。</div>
      </div>

      {load.ok ? (
        <>
          <SettingsForm settings={load.settings} />
          <OrderUiSettingsSection resolved={load.settings.resolvedOrderUi} />
        </>
      ) : (
        <SettingsStoreLoadFailure detail={load.detail} reason={load.reason} />
      )}

      <ImportSection />
      <ExportSection />
    </div>
  );
}
