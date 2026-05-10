"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerSearch({ q, filter }: { q: string; filter: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(q);

  function apply(overrides?: { q?: string; filter?: string }) {
    const params = new URLSearchParams();
    const qVal = overrides?.q ?? search;
    const filterVal = overrides?.filter ?? filter;
    if (qVal.trim()) params.set("q", qVal.trim());
    if (filterVal !== "all") params.set("filter", filterVal);
    const query = params.toString();
    router.push(query ? `/customers?${query}` : "/customers");
  }

  return (
    <section className="ui-panel flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="ui-input h-10 flex-1 md:h-9"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
          placeholder="搜索：手机号 / 姓名"
          value={search}
        />
        <div className="flex gap-2">
          <button
            className="ui-btn ui-btn-primary h-10 px-3 md:h-9"
            onClick={() => apply()}
            type="button"
          >
            搜索
          </button>
          <button
            className={chipClass(filter === "active")}
            onClick={() => apply({ filter: filter === "active" ? "all" : "active" })}
            type="button"
          >
            有进行中工单
          </button>
          <button
            className={chipClass(filter === "recent")}
            onClick={() => apply({ filter: filter === "recent" ? "all" : "recent" })}
            type="button"
          >
            最近有工单
          </button>
        </div>
      </div>
    </section>
  );
}

function chipClass(active: boolean) {
  return [
    "ui-btn h-10 rounded-xl border px-3 text-sm font-medium md:h-9",
    active
      ? "border-status-warn bg-status-warn text-status-warn-foreground"
      : "border-border bg-muted text-foreground",
  ].join(" ");
}
