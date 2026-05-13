import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "发送记录 — ChinaTechOS",
  description: "按模板、时间、操作人追溯消息发送状态",
};

export default function MessageLogsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">发送记录</h1>
        <div className="mt-1 text-sm text-muted-foreground">按模板、时间、操作人追溯消息发送状态。</div>
      </div>

      <section className="glass-card p-3 md:p-4">
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

      <section className="glass-card p-3 md:p-4">
        <div className="text-sm font-semibold text-foreground">发送记录列表</div>
        <div className="mt-3 rounded-xl border border-border bg-surface px-3 py-8 text-sm text-muted-foreground">
          暂无发送记录（后续接入 message_logs 查询）。
        </div>
      </section>
    </div>
  );
}
