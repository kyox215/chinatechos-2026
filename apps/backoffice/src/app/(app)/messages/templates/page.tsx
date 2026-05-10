import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "消息模板 — ChinaTechOS",
  description: "统一维护 WhatsApp 模板与变量",
};

export default function MessageTemplatesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">消息模板</h1>
          <div className="mt-1 text-sm text-muted-foreground">统一维护 WhatsApp 模板与变量。</div>
        </div>
        <button
          className="h-10 rounded-xl px-4 text-sm font-semibold text-primary-foreground sm:h-9"
          style={{ background: "var(--gradient-brand)" }}
        >
          新建模板
        </button>
      </div>

      <section className="glass-card p-3 md:p-4">
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
          <button className="ui-btn ui-btn-secondary h-10 px-3 font-medium text-muted-foreground md:h-9">
            仅显示启用模板
          </button>
        </div>
      </section>

      <section className="glass-card p-3 md:p-4">
        <div className="text-sm font-semibold text-foreground">模板列表</div>
        <div className="mt-3 rounded-xl border border-border bg-surface px-3 py-8 text-sm text-muted-foreground">
          暂无模板数据（后续接入模板 CRUD）。
        </div>
      </section>
    </div>
  );
}
