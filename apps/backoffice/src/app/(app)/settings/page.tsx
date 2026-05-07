import { SettingsForm } from "@/components/settings/SettingsForm";
import { ImportSection } from "@/components/settings/ImportSection";
import { ExportSection } from "@/components/settings/ExportSection";
import { OrderUiSettingsSection } from "@/components/settings/OrderUiSettingsSection";
import { SettingsStoreLoadFailure } from "@/components/settings/SettingsStoreLoadFailure";
import { getStoreSettingsLoadResult } from "@/lib/data/store-settings";

export default async function SettingsPage() {
  const load = await getStoreSettingsLoadResult();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">设置</h1>
        <div className="mt-1 text-sm text-neutral-600">管理门店信息、自动化参数与系统选项。</div>
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
