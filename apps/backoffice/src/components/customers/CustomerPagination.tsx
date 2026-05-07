"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function CustomerPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    const qs = params.toString();
    router.push(qs ? `/customers?${qs}` : "/customers");
  }

  const pages = buildPageNumbers(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1 py-2">
      <button
        className="ui-btn ui-btn-secondary h-9 px-3 text-xs disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
        type="button"
      >
        上一页
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-neutral-400">...</span>
        ) : (
          <button
            key={p}
            className={`h-9 min-w-[36px] rounded-lg px-2 text-sm font-medium ${
              p === page
                ? "bg-primary text-white"
                : "text-neutral-700 hover:bg-muted"
            }`}
            onClick={() => goTo(p as number)}
            type="button"
          >
            {p}
          </button>
        ),
      )}

      <button
        className="ui-btn ui-btn-secondary h-9 px-3 text-xs disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => goTo(page + 1)}
        type="button"
      >
        下一页
      </button>
    </nav>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}
