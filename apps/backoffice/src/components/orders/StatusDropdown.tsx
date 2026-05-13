"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { postOrderTransition } from "@/lib/api/order-transition-client";

type ActionItem = {
  toStatus: string;
  label: string;
  confirmText: string;
  variant?: "danger";
};

type SupplierOption = { id: string; short_name: string; color: string };

type Props = {
  orderId: string;
  actions: ActionItem[];
};

export function StatusDropdown({ orderId, actions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierPicker, setSupplierPicker] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  useEffect(() => {
    if (!supplierPicker) return;
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d: { items?: SupplierOption[] }) => setSuppliers(d.items ?? []))
      .catch(() => {});
  }, [supplierPicker]);

  async function handleTransition(action: ActionItem, supplierId?: string) {
    if (!confirm(action.confirmText)) return;
    setPending(true);
    setError(null);
    try {
      await postOrderTransition(orderId, {
        toStatus: action.toStatus,
        supplierId,
      });
      router.refresh();
      setOpen(false);
      setSupplierPicker(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "状态流转失败";
      setError(msg);
      console.error("[StatusDropdown] transition failed", e);
    } finally {
      setPending(false);
    }
  }

  function handleClick(action: ActionItem) {
    if (action.toStatus === "parts_ordered") {
      setOpen(false);
      setSupplierPicker(true);
      return;
    }
    handleTransition(action);
  }

  function handleSupplierConfirm() {
    const action = actions.find((a) => a.toStatus === "parts_ordered");
    if (!action) return;
    handleTransition(action, selectedSupplier || undefined);
  }

  return (
    <div className="relative flex flex-col items-end gap-1">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="ui-btn ui-btn-secondary h-9 min-h-9 px-3 text-xs"
        disabled={pending}
        onClick={() => {
          setError(null);
          setOpen((v) => !v);
        }}
        type="button"
      >
        更多操作 ▾
      </button>
      {error ? (
        <div className="max-w-[14rem] text-right text-[11px] text-status-danger-foreground">{error}</div>
      ) : null}
      {open && (
        <>
          <button
            aria-label="关闭菜单"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="absolute right-0 top-full z-40 mt-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
            {actions.map((action) => (
              <button
                key={action.toStatus}
                className={`block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted ${
                  action.variant === "danger" ? "text-status-danger-foreground" : "text-foreground"
                }`}
                onClick={() => handleClick(action)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}

      {supplierPicker && (
        <>
          <button
            aria-label="关闭供应商选择"
            className="fixed inset-0 z-40 cursor-default bg-background/75"
            onClick={() => setSupplierPicker(false)}
            type="button"
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-4 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-foreground font-display">选择供应商</h3>
            <select
              className="ui-input w-full mb-3"
              onChange={(e) => setSelectedSupplier(e.target.value)}
              value={selectedSupplier}
            >
              <option value="">不指定供应商</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.short_name}</option>
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
