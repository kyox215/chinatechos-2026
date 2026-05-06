export default function CustomersPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">客户</h1>
          <div className="mt-1 text-sm text-neutral-600">按手机号快速定位客户与历史工单。</div>
        </div>
        <button className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white sm:h-9">
          新建客户
        </button>
      </div>

      <section className="ui-panel">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            className="ui-input"
            placeholder="搜索：手机号 / 姓名"
          />
          <button className="ui-btn ui-btn-secondary h-10 px-3 font-medium text-neutral-700 md:h-9">
            最近有工单
          </button>
          <button className="ui-btn ui-btn-secondary h-10 px-3 font-medium text-neutral-700 md:h-9">
            未完成工单
          </button>
        </div>
      </section>

      <section className="ui-panel">
        <div className="text-sm font-semibold text-neutral-900">客户列表</div>
        <div className="mt-3 rounded-xl border border-border bg-surface-2 px-3 py-8 text-sm text-neutral-500">
          暂无客户数据（后续接入 customers 列表与详情）。
        </div>
      </section>
    </div>
  );
}
