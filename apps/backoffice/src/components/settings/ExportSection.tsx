"use client";

import { useState } from "react";

export function ExportSection() {
  const [status, setStatus] = useState("all");

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">数据导出</h2>
      <p className="mb-3 text-xs text-neutral-500">
        将工单数据导出为 Excel (.xlsx) 或 CSV 文件。可按状态筛选导出范围。
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="ui-input h-9 w-auto text-sm"
          onChange={(e) => setStatus(e.target.value)}
          value={status}
        >
          <option value="all">全部状态</option>
          <option value="new">接单</option>
          <option value="diagnosing">检测中</option>
          <option value="quoted">已报价</option>
          <option value="waiting_approval">等回复</option>
          <option value="repairing">维修中</option>
          <option value="parts_ordered">等配件</option>
          <option value="parts_arrived">到货</option>
          <option value="repaired">修好</option>
          <option value="notified">已通知</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
        <a
          className="ui-btn ui-btn-primary inline-flex h-9 items-center px-4 text-xs font-semibold"
          href={`/api/orders/export?format=xlsx&status=${status}`}
        >
          导出 Excel
        </a>
        <a
          className="ui-btn ui-btn-secondary inline-flex h-9 items-center px-4 text-xs font-semibold"
          href={`/api/orders/export?format=csv&status=${status}`}
        >
          导出 CSV
        </a>
      </div>
    </section>
  );
}
