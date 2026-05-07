import Link from "next/link";
import type { InventoryItemRow } from "@/lib/data/inventory";
import {
  formatInventoryBadgesFromQa,
  inventoryStatusClass,
  presentInventoryChannel,
  presentInventoryStatus,
} from "@/lib/domain/inventory-presentation";

function fmtMoney(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export function InventoryList(props: { items: InventoryItemRow[] }) {
  const { items } = props;

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {items.map((it) => (
          <Link
            key={it.id}
            className="block rounded-xl border border-border bg-surface-2 p-3 transition-colors hover:bg-muted"
            href={`/inventory/${it.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold text-neutral-900">{it.public_no}</div>
                <div className="mt-0.5 truncate text-sm text-neutral-600">
                  {it.brand} {it.model}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${inventoryStatusClass(it.lifecycle_status)}`}
                  >
                    {presentInventoryStatus(it.lifecycle_status)}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-neutral-600 ring-1 ring-border">
                    {presentInventoryChannel(it.product_channel)}
                  </span>
                </div>
                {formatInventoryBadgesFromQa(it.qa_report as Record<string, unknown>).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formatInventoryBadgesFromQa(it.qa_report as Record<string, unknown>).map((b) => (
                      <span
                        key={b}
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900 ring-1 ring-amber-200"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 text-right text-xs text-neutral-500">{fmtMoney(it.list_price)}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden lg:block">
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-2 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">编号</th>
                <th className="whitespace-nowrap px-4 py-3">渠道</th>
                <th className="whitespace-nowrap px-4 py-3">状态</th>
                <th className="whitespace-nowrap px-4 py-3">设备</th>
                <th className="whitespace-nowrap px-4 py-3">标价</th>
                <th className="whitespace-nowrap px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id} className="bg-surface hover:bg-muted/60">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900">{it.public_no}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                    {presentInventoryChannel(it.product_channel)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${inventoryStatusClass(it.lifecycle_status)}`}
                    >
                      {presentInventoryStatus(it.lifecycle_status)}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-neutral-700">
                    {it.brand} {it.model}
                    {it.imei_or_serial ? (
                      <span className="block truncate text-xs text-neutral-500">{it.imei_or_serial}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-neutral-800">{fmtMoney(it.list_price)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link className="text-primary hover:underline" href={`/inventory/${it.id}`}>
                      详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
