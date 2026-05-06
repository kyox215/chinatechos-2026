"use client";

import { useEffect, useState } from "react";
import { SupplierSelect } from "@/components/orders/SupplierSelect";

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  publicNo: string;
  initialSupplierId: string | null;
  onSaved?: () => void;
};

/** Bottom-sheet on mobile, centered dialog on sm+; PATCH order supplier_id. */
export function SupplierPickerModal({
  open,
  onClose,
  orderId,
  publicNo,
  initialSupplierId,
  onSaved,
}: Props) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialSupplierId ?? "");
    setError(null);
  }, [open, orderId, initialSupplierId]);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: value.trim() || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div
        aria-labelledby="supplier-picker-title"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(88dvh,560px)] flex-col rounded-t-2xl border border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,520px)] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        role="dialog"
      >
        <div className="mb-3 shrink-0 border-b border-border pb-3">
          <h2 className="text-base font-semibold text-neutral-900" id="supplier-picker-title">
            选择供应商
          </h2>
          <p className="mt-1 text-xs text-neutral-500">{publicNo}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <label className="mb-1 block text-xs font-medium text-neutral-600" htmlFor="supplier-picker-select">
            配件来源
          </label>
          <SupplierSelect
            id="supplier-picker-select"
            className="ui-input w-full text-sm"
            emptyLabel="未选择供应商"
            onChange={setValue}
            value={value}
          />
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
        <div className="mt-4 flex shrink-0 gap-2 border-t border-border pt-4">
          <button
            className="ui-btn ui-btn-secondary h-11 min-h-[44px] flex-1 text-sm"
            disabled={pending}
            type="button"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="ui-btn ui-btn-primary h-11 min-h-[44px] flex-1 text-sm disabled:opacity-60"
            disabled={pending}
            type="button"
            onClick={handleSave}
          >
            {pending ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </>
  );
}
