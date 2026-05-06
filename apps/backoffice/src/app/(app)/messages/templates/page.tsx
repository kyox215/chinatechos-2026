export default function MessageTemplatesPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">消息模板</h1>
          <div className="mt-1 text-sm text-neutral-600">统一维护 WhatsApp 模板与变量。</div>
        </div>
        <button className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white sm:h-9">
          新建模板
        </button>
      </div>

      <section className="ui-panel">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select className="ui-input">
            <option>类型：全部</option>
            <option>报价确认</option>
            <option>可取件通知</option>
            <option>超期提醒</option>
          </select>
          <select className="ui-input">
            <option>语言：全部</option>
            <option>IT</option>
            <option>EN</option>
          </select>
          <button className="ui-btn ui-btn-secondary h-10 px-3 font-medium text-neutral-700 md:h-9">
            仅显示启用模板
          </button>
        </div>
      </section>

      <section className="ui-panel">
        <div className="text-sm font-semibold text-neutral-900">模板列表</div>
        <div className="mt-3 rounded-xl border border-border bg-surface-2 px-3 py-8 text-sm text-neutral-500">
          暂无模板数据（后续接入模板 CRUD）。
        </div>
      </section>
    </div>
  );
}
