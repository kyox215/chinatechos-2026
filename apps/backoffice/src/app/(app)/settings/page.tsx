export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">设置</h1>
        <div className="mt-1 text-sm text-neutral-600">管理门店信息、自动化参数与系统选项。</div>
      </div>

      <section className="ui-panel">
        <div className="text-sm font-semibold text-neutral-900">门店信息</div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input className="ui-input" placeholder="门店名称" />
          <input className="ui-input" placeholder="门店短号（store_code）" />
        </div>
      </section>

      <section className="ui-panel">
        <div className="text-sm font-semibold text-neutral-900">自动化参数</div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input className="ui-input" placeholder="报价提醒（小时）默认 48" />
          <input className="ui-input" placeholder="未取件提醒（天）默认 5" />
        </div>
      </section>
    </div>
  );
}
