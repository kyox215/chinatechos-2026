import { NextRequest, NextResponse } from "next/server";
import { listInventoryItemsForExport } from "@/lib/data/inventory";
import {
  formatInventoryBadgesFromQa,
  presentInventoryChannel,
  presentInventoryStatus,
} from "@/lib/domain/inventory-presentation";

function escapeCsvCell(v: string): string {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function fmtEur(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "";
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtIsoIt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Rome",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;

  try {
    const rows = await listInventoryItemsForExport({ q, channel, status, dateFrom, dateTo });

    const headers = [
      "编号",
      "渠道",
      "状态",
      "品牌",
      "型号",
      "IMEI_SN",
      "标价EUR",
      "成本EUR",
      "售出价EUR",
      "质检摘要",
      "冷冻至",
      "创建时间",
    ];

    const lines = [headers.map(escapeCsvCell).join(",")];

    for (const r of rows) {
      const qaSummary = formatInventoryBadgesFromQa(r.qa_report as Record<string, unknown>).join(";");
      const row = [
        r.public_no,
        presentInventoryChannel(r.product_channel),
        presentInventoryStatus(r.lifecycle_status),
        r.brand,
        r.model,
        r.imei_or_serial ?? "",
        fmtEur(r.list_price),
        fmtEur(r.purchase_cost),
        fmtEur(r.sold_price),
        qaSummary,
        r.listing_hold_until ? fmtIsoIt(r.listing_hold_until) : "",
        fmtIsoIt(r.created_at),
      ].map((c) => escapeCsvCell(String(c)));
      lines.push(row.join(","));
    }

    const csv = "\uFEFF" + lines.join("\r\n");
    const filename = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
