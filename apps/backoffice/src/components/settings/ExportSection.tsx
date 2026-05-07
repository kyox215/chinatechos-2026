"use client";

import { useState } from "react";
import { getOrderStatusSelectOptions } from "@/lib/domain/order-status";

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
          {getOrderStatusSelectOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
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
