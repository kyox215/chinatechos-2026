"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useResolvedOrderUi } from "@/components/order-ui/OrderUiProvider";
import { StatusProgressRail } from "@/components/orders/StatusProgressRail";
import { SupplierSelect } from "@/components/orders/SupplierSelect";
import { postOrderTransition } from "@/lib/api/order-transition-client";
import type { ActionItem } from "@/lib/domain/order-status";
import { getNextActions } from "@/lib/domain/order-status";
import { resolveStatusLabel } from "@/lib/domain/order-ui-config";

type SupplierOption = { id: string; short_name: string; color: string };

/** 与桌面菜单最大宽度一致，用于避免贴边（8 列状态网格） */
const MENU_LAYOUT_W = 680;
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
  const [error, setError] = useState<string | null>(null);
  const [supplierPicker, setSupplierPicker] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const ui = useResolvedOrderUi();

  const transitions = useMemo(() => {
    const { primary, secondary } = getNextActions(status, ui.statusLabels, ui.statusOrder);
    const m = new Map<string, ActionItem>();
    for (const a of [...primary, ...secondary]) m.set(a.toStatus, a);
    return m;
  }, [status, ui.statusLabels, ui.statusOrder]);

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
    const left = Math.min(Math.max(EDGE, rect.left), window.innerWidth - MENU_LAYOUT_W - EDGE);
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
    setError(null);
    setOpen(true);
  }

  async function handleTransition(toStatus: string, confirmText: string, supplierId?: string) {
    if (!confirm(confirmText)) return;
    setPending(true);
    setError(null);
    try {
      await postOrderTransition(orderId, {
        toStatus,
        supplierId,
      });
      router.refresh();
      setOpen(false);
      setSupplierPicker(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "状态流转失败";
      setError(msg);
      console.error("[StatusPopover] transition failed", e);
    } finally {
      setPending(false);
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

  function handleStepPress(toStatus: string) {
    const action = transitions.get(toStatus);
    if (!action) return;
    handleClick(action.toStatus, action.confirmText);
  }

  function handleSupplierConfirm() {
    const action = transitions.get("parts_ordered");
    if (!action) return;
    handleTransition(action.toStatus, action.confirmText, selectedSupplier || undefined);
  }

  const progressGrid = (
    <StatusProgressRail
      currentStatus={status}
      labelFor={(s) => resolveStatusLabel(s, ui)}
      pending={pending}
      statusOrder={ui.statusOrder}
      transitions={transitions}
      onStepPress={handleStepPress}
    />
  );

  const desktopMenu = open && !isMobile && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[280px] max-w-[min(calc(100vw-1rem),680px)] rounded-xl border border-border bg-surface p-3 shadow-lg sm:p-4"
        style={{ top: pos.top, left: pos.left }}
      >
        {progressGrid}
      </div>
    </>
  );

  const mobileSheet = open && isMobile && (
    <>
      <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setOpen(false)} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground font-display">切换状态</span>
            <OrderStatusBadge status={status} />
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {progressGrid}
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
      <div className="flex min-w-0 flex-col items-start gap-0.5">
        <button
          ref={btnRef}
          className="cursor-pointer rounded-md px-1 py-0.5 transition-colors hover:bg-accent"
          disabled={pending}
          onClick={() => (open ? setOpen(false) : openPopover())}
          type="button"
        >
          {pending ? (
            <span className="text-xs text-muted-foreground">切换中...</span>
          ) : (
            <OrderStatusBadge status={status} />
          )}
        </button>
        {error ? <span className="max-w-[12rem] text-[10px] leading-tight text-status-danger-foreground">{error}</span> : null}
      </div>

      {typeof document !== "undefined" && createPortal(portalContent, document.body)}

      {supplierPicker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSupplierPicker(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-4 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-foreground font-display">选择供应商</h3>
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
