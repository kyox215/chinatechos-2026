export default function MessageLogsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">发送记录</h1>
        <div className="mt-1 text-sm text-neutral-600">按模板、时间、操作人追溯消息发送状态。</div>
      </div>

      <section className="ui-panel">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            className="ui-input"
            placeholder="工单号"
          />
          <select className="ui-input">
            <option>模板类型：全部</option>
            <option>报价确认</option>
            <option>可取件通知</option>
            <option>超期提醒</option>
          </select>
          <input className="ui-input" type="date" />
          <input className="ui-input" type="date" />
        </div>
      </section>

      <section className="ui-panel">
        <div className="text-sm font-semibold text-neutral-900">发送记录列表</div>
        <div className="mt-3 rounded-xl border border-border bg-surface-2 px-3 py-8 text-sm text-neutral-500">
          暂无发送记录（后续接入 message_logs 查询）。
        </div>
      </section>
    </div>
  );
}
