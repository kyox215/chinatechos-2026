"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarcodeScanner } from "@/components/orders/BarcodeScanner";

type Props = {
  q?: string;
  channel: string;
  status: string;
  dateFrom?: string;
  dateTo?: string;
};

export function InventoryListToolbar(props: Props) {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);

  const exportHref = buildExportHref(props);

  const onScan = useCallback(
    async (raw: string) => {
      const res = await fetch("/api/inventory/lookup-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const data = (await res.json()) as
        | { match: "direct"; id: string }
        | { match: "search"; q: string }
        | { error?: string };

      if (!res.ok || ("error" in data && Boolean(data.error))) {
        router.push(`/inventory?q=${encodeURIComponent(raw.trim())}`);
        return;
      }

      if ("match" in data && data.match === "direct") {
        router.push(`/inventory/${data.id}`);
        return;
      }

      const q = "match" in data && data.match === "search" ? data.q : raw.trim();
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (props.channel && props.channel !== "all") sp.set("channel", props.channel);
      if (props.status && props.status !== "all") sp.set("status", props.status);
      if (props.dateFrom?.trim()) sp.set("dateFrom", props.dateFrom.trim());
      if (props.dateTo?.trim()) sp.set("dateTo", props.dateTo.trim());
      router.push(`/inventory?${sp.toString()}`);
    },
    [props.channel, props.status, props.dateFrom, props.dateTo, router],
  );

  return (
    <>
      <BarcodeScanner onClose={() => setScannerOpen(false)} onScan={onScan} open={scannerOpen} />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          className="ui-btn ui-btn-secondary flex h-10 shrink-0 items-center justify-center gap-2 px-4 text-xs md:h-9"
          onClick={() => setScannerOpen(true)}
          type="button"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.375v1.5H5.25v3H3.75v-3.375zM3.75 15.75v3.375c0 .621.504 1.125 1.125 1.125h3.375v-1.5H5.25v-3H3.75zm16.5-10.875v3.375h-1.5v-3h-3v-1.5h3.375c.621 0 1.125.504 1.125 1.125zm-1.5 10.875v3h-3v1.5h3.375c.621 0 1.125-.504 1.125-1.125V15.75h-1.5zM7.5 9v6h1.5V9H7.5zm3 0v6h3V9h-3zm4.5 0v6h1.5V9H15z" />
          </svg>
          扫码跳转
        </button>
        <a
          className="ui-btn ui-btn-secondary flex h-10 items-center justify-center px-4 text-xs md:h-9"
          href={exportHref}
        >
          导出 CSV
        </a>
        <Link className="ui-btn ui-btn-primary flex h-10 items-center justify-center px-4 text-xs md:h-9" href="/inventory/new">
          新建入库
        </Link>
      </div>
    </>
  );
}

function buildExportHref(p: Props): string {
  const sp = new URLSearchParams();
  if (p.q?.trim()) sp.set("q", p.q.trim());
  if (p.channel && p.channel !== "all") sp.set("channel", p.channel);
  if (p.status && p.status !== "all") sp.set("status", p.status);
  if (p.dateFrom?.trim()) sp.set("dateFrom", p.dateFrom.trim());
  if (p.dateTo?.trim()) sp.set("dateTo", p.dateTo.trim());
  const qs = sp.toString();
  return qs ? `/api/inventory/export?${qs}` : "/api/inventory/export";
}
