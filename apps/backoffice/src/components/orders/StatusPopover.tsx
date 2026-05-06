"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { getNextActions } from "@/lib/domain/order-status";

type SupplierOption = { id: string; short_name: string; color: string };

const TERMINAL = new Set(["completed", "cancelled"]);

export function StatusPopover({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [supplierPicker, setSupplierPicker] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const { primary, secondary } = getNextActions(status);

  useEffect(() => {
    if (!supplierPicker) return;
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d: { items?: SupplierOption[] }) => setSuppliers(d.items ?? []))
      .catch(() => {});
  }, [supplierPicker]);

  function openPopover() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  }

  async function handleTransition(toStatus: string, confirmText: string, supplierId?: string) {
    if (!confirm(confirmText)) return;
    setPending(true);
    try {
      const payload: Record<string, string> = { toStatus, operatorName: "frontdesk" };
      if (supplierId) payload.supplierId = supplierId;
      await fetch(`/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
    } finally {
      setPending(false);
      setOpen(false);
      setSupplierPicker(false);
    }
  }

  function handleClick(toStatus: string, confirmText: string) {
    if (toStatus === "parts_ordered") {
      setOpen(false);
      setSupplierPicker(true);
      return;
    }
    handleTransition(toStatus, confirmText);
  }

  function handleSupplierConfirm() {
    const action = [...primary, ...secondary].find((a) => a.toStatus === "parts_ordered");
    if (!action) return;
    handleTransition(action.toStatus, action.confirmText, selectedSupplier || undefined);
  }

  if (TERMINAL.has(status)) {
    return <OrderStatusBadge status={status} />;
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        className="cursor-pointer rounded-md px-1 py-0.5 transition-colors hover:bg-neutral-100"
        disabled={pending}
        onClick={() => (open ? setOpen(false) : openPopover())}
        type="button"
      >
        {pending ? (
          <span className="text-xs text-neutral-400">切换中...</span>
        ) : (
          <OrderStatusBadge status={status} />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            {primary.length > 0 && (
              <div className="mb-1">
                {primary.map((action) => (
                  <button
                    key={action.toStatus}
                    className="flex w-full items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    onClick={() => handleClick(action.toStatus, action.confirmText)}
                    type="button"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {secondary.length > 0 && primary.length > 0 && (
              <div className="my-1 border-t border-border" />
            )}

            <div className="max-h-48 overflow-y-auto">
              {secondary.map((action) => (
                <button
                  key={action.toStatus}
                  className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs hover:bg-muted ${
                    action.variant === "danger" ? "text-rose-600" : "text-neutral-700"
                  }`}
                  onClick={() => handleClick(action.toStatus, action.confirmText)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {supplierPicker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSupplierPicker(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-4 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">选择供应商</h3>
            <select
              className="ui-input mb-3 w-full"
              onChange={(e) => setSelectedSupplier(e.target.value)}
              value={selectedSupplier}
            >
              <option value="">不指定供应商</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.short_name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                className="ui-btn ui-btn-primary h-9 flex-1 text-sm disabled:opacity-60"
                disabled={pending}
                onClick={handleSupplierConfirm}
                type="button"
              >
                {pending ? "处理中..." : "确认转到等配件"}
              </button>
              <button
                className="ui-btn ui-btn-secondary h-9 px-3 text-sm"
                onClick={() => setSupplierPicker(false)}
                type="button"
              >
                取消
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
