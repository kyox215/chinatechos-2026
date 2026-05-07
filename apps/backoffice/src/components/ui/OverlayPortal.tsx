"use client";

import { createPortal } from "react-dom";
import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  /** Outer overlay shell (must include position/sizing, e.g. fixed inset-0 flex ...) */
  className: string;
  children: ReactNode;
  /** Prevent page scroll while open (default true for mobile sheets) */
  lockBodyScroll?: boolean;
  /** Fires when user clicks the overlay backdrop (not bubbled from children) */
  onBackdropClick?: () => void;
};

export function OverlayPortal({
  open,
  className,
  children,
  lockBodyScroll = true,
  onBackdropClick,
}: Props) {
  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockBodyScroll]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={className}
      onClick={
        onBackdropClick
          ? (e) => {
              if (e.target === e.currentTarget) onBackdropClick();
            }
          : undefined
      }
    >
      {children}
    </div>,
    document.body,
  );
}
