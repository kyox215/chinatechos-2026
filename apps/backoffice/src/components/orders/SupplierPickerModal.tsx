"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SUPPLIER_PALETTE } from "@/components/orders/supplier-palette";

type SupplierOption = { id: string; short_name: string; color: string };

const MENU_W = 200;
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

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  publicNo: string;
  initialSupplierId: string | null;
  onSaved?: () => void;
  anchorEl?: HTMLElement | null;
};

/** Popover on desktop, bottom-sheet on mobile; click to save immediately. */
export function SupplierPickerModal({
  open,
  onClose,
  orderId,
  publicNo,
  initialSupplierId,
  onSaved,
  anchorEl,
}: Props) {
  const isMobile = useIsMobile();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [pending, setPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d: { items?: SupplierOption[] }) => setSuppliers(d.items ?? []))
      .catch(() => {});
  }, [open]);

  const recalcPos = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const mH = menuRef.current?.offsetHeight ?? 300;
    const top =
      rect.bottom + GAP + mH > window.innerHeight - EDGE
        ? Math.max(EDGE, rect.top - mH - GAP)
        : rect.bottom + GAP;
    const left = Math.min(Math.max(EDGE, rect.left), window.innerWidth - MENU_W - EDGE);
    setPos({ top, left });
  }, [anchorEl]);

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

  async function handleSelect(supplierId: string | null) {
    setPending(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: supplierId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      onSaved?.();
      onClose();
    } catch {
      // silently close on error for quick-pick UX
      onClose();
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  const palette = (color: string) => SUPPLIER_PALETTE[color] ?? SUPPLIER_PALETTE.blue;

  const optionList = (mobile: boolean) => (
    <>
      <button
        className={
          mobile
            ? `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm active:bg-muted ${
                !initialSupplierId ? "bg-muted/60 font-medium text-foreground" : "text-muted-foreground"
              }`
            : `flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs hover:bg-muted ${
                !initialSupplierId ? "bg-muted/60 font-medium text-foreground" : "text-muted-foreground"
              }`
        }
        disabled={pending}
        onClick={() => handleSelect(null)}
        type="button"
      >
        <span className={`${mobile ? "h-2.5 w-2.5" : "h-2 w-2"} shrink-0 rounded-full bg-muted-foreground`} />
        不指定供应商
      </button>
      {suppliers.map((s) => {
        const c = palette(s.color);
        const isActive = s.id === initialSupplierId;
        return (
          <button
            key={s.id}
            className={
              mobile
                ? `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm active:bg-muted ${
                    isActive ? "bg-muted/60 font-medium text-foreground" : "text-foreground"
                  }`
                : `flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs hover:bg-muted ${
                    isActive ? "bg-muted/60 font-medium text-foreground" : "text-foreground"
                  }`
            }
            disabled={pending}
            onClick={() => handleSelect(s.id)}
            type="button"
          >
            <span className={`${mobile ? "h-2.5 w-2.5" : "h-2 w-2"} shrink-0 rounded-full ${c.bg} ${c.text}`} />
            {s.short_name}
          </button>
        );
      })}
    </>
  );

  const desktopPopover = !isMobile && (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 w-[200px] rounded-xl border border-border bg-surface p-1 shadow-lg"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="max-h-64 overflow-y-auto">
          {optionList(false)}
        </div>
      </div>
    </>
  );

  const mobileSheet = isMobile && (
    <>
      <div className="fixed inset-0 z-40 bg-background/75" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-foreground font-display">选择供应商</span>
            <p className="mt-0.5 text-xs text-muted-foreground">{publicNo}</p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={onClose}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="space-y-1">
            {optionList(true)}
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {desktopPopover}
      {mobileSheet}
    </>,
    document.body,
  );
}
