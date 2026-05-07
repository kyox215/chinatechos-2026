"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { getNextActions } from "@/lib/domain/order-status";
import { SupplierSelect } from "@/components/orders/SupplierSelect";

type SupplierOption = { id: string; short_name: string; color: string };

const MENU_W = 176;
const GAP = 4;
const EDGE = 8;

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

export function StatusPopover({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [supplierPicker, setSupplierPicker] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const { primary, secondary } = getNextActions(status);

  useEffect(() => {
    if (!supplierPicker) return;
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d: { items?: SupplierOption[] }) => setSuppliers(d.items ?? []))
      .catch(() => {});
  }, [supplierPicker]);

  const recalcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const mH = menuRef.current?.offsetHeight ?? 240;
    const top =
      rect.bottom + GAP + mH > window.innerHeight - EDGE
        ? Math.max(EDGE, rect.top - mH - GAP)
        : rect.bottom + GAP;
    const left = Math.min(Math.max(EDGE, rect.left), window.innerWidth - MENU_W - EDGE);
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open && !isMobile) recalcPos();
  }, [open, isMobile, recalcPos]);

  useEffect(() => {
    if (!open || isMobile) return;
    const handler = () => recalcPos();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, isMobile, recalcPos]);

  function openPopover() {
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

  const actionButtons = (mobile: boolean) => (
    <>
      {primary.length > 0 && (
        <div className={mobile ? "space-y-1" : "mb-1"}>
          {primary.map((action) => (
            <button
              key={action.toStatus}
              className={
                mobile
                  ? "flex w-full items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-left text-sm font-semibold text-indigo-700 active:bg-indigo-100"
                  : "flex w-full items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              }
              onClick={() => handleClick(action.toStatus, action.confirmText)}
              type="button"
            >
              <svg className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <div className={mobile ? "space-y-1" : "max-h-48 overflow-y-auto"}>
        {secondary.map((action) => (
          <button
            key={action.toStatus}
            className={
              mobile
                ? `flex w-full items-center rounded-xl px-4 py-3 text-left text-sm active:bg-muted ${
                    action.variant === "danger" ? "text-rose-600" : "text-neutral-700"
                  }`
                : `block w-full rounded-lg px-3 py-1.5 text-left text-xs hover:bg-muted ${
                    action.variant === "danger" ? "text-rose-600" : "text-neutral-700"
                  }`
            }
            onClick={() => handleClick(action.toStatus, action.confirmText)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
    </>
  );

  const desktopMenu = open && !isMobile && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div
        ref={menuRef}
        className="fixed z-50 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg"
        style={{ top: pos.top, left: pos.left }}
      >
        {actionButtons(false)}
      </div>
    </>
  );

  const mobileSheet = open && isMobile && (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900">切换状态</span>
            <OrderStatusBadge status={status} />
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-muted"
            onClick={() => setOpen(false)}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {actionButtons(true)}
        </div>
      </div>
    </>
  );

  const portalContent = (
    <>
      {desktopMenu}
      {mobileSheet}
    </>
  );

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

      {typeof document !== "undefined" && createPortal(portalContent, document.body)}

      {supplierPicker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSupplierPicker(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-4 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">选择供应商</h3>
            <SupplierSelect
              className="ui-input mb-3 w-full text-sm"
              emptyLabel="不指定供应商"
              onChange={setSelectedSupplier}
              options={suppliers}
              value={selectedSupplier}
            />
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
