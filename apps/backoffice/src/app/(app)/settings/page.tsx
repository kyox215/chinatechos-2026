import { SettingsForm } from "@/components/settings/SettingsForm";
import { ImportSection } from "@/components/settings/ImportSection";
import { ExportSection } from "@/components/settings/ExportSection";
import { getStoreSettings } from "@/lib/data/store-settings";

export default async function SettingsPage() {
  const settings = await getStoreSettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">设置</h1>
        <div className="mt-1 text-sm text-neutral-600">管理门店信息、自动化参数与系统选项。</div>
      </div>

      {settings ? (
        <SettingsForm settings={settings} />
      ) : (
        <div className="rounded-xl border border-border px-4 py-8 text-sm text-neutral-500">
          无法加载门店设置。请检查数据库连接和 stores 表数据。
        </div>
      )}

      <ImportSection />
      <ExportSection />
    </div>
  );
}
