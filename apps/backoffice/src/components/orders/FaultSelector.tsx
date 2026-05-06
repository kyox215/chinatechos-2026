"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FAULT_TYPES } from "@/lib/domain/fault-types";
import type { FaultType } from "@/lib/domain/fault-types";

type Props = {
  selected: Map<string, string[]>;
  onChange: (next: Map<string, string[]>) => void;
};

export function FaultSelector({ selected, onChange }: Props) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  function handleMainClick(ft: FaultType) {
    const next = new Map(selected);
    if (next.has(ft.key)) {
      if (openPopover === ft.key) {
        setOpenPopover(null);
      } else if (ft.subTypes && ft.subTypes.length > 0) {
        setOpenPopover(ft.key);
      } else {
        next.delete(ft.key);
        onChange(next);
      }
    } else {
      next.set(ft.key, ["_self"]);
      onChange(next);
      if (ft.subTypes && ft.subTypes.length > 0) {
        setOpenPopover(ft.key);
      }
    }
  }

  function handleSubToggle(mainKey: string, subKey: string) {
    const next = new Map(selected);
    const current = next.get(mainKey) ?? [];

    if (subKey === "_self") {
      next.set(mainKey, ["_self"]);
    } else {
      const filtered = current.filter((k) => k !== "_self");
      if (filtered.includes(subKey)) {
        const updated = filtered.filter((k) => k !== subKey);
        if (updated.length === 0) next.set(mainKey, ["_self"]);
        else next.set(mainKey, updated);
      } else {
        next.set(mainKey, [...filtered.filter((k) => k !== subKey), subKey]);
      }
    }
    onChange(next);
  }

  function handleRemove(mainKey: string) {
    const next = new Map(selected);
    next.delete(mainKey);
    onChange(next);
    setOpenPopover(null);
  }

  const isActive = (key: string) => selected.has(key) && (selected.get(key)?.length ?? 0) > 0;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
      {FAULT_TYPES.map((ft) => (
        <FaultButton
          key={ft.key}
          fault={ft}
          active={isActive(ft.key)}
          selectedSubs={selected.get(ft.key) ?? []}
          popoverOpen={openPopover === ft.key}
          onMainClick={() => handleMainClick(ft)}
          onSubToggle={(subKey) => handleSubToggle(ft.key, subKey)}
          onClosePopover={() => setOpenPopover(null)}
          onRemove={() => handleRemove(ft.key)}
        />
      ))}
    </div>
  );
}

const FaultButton = memo(function FaultButton({
  fault,
  active,
  selectedSubs,
  popoverOpen,
  onMainClick,
  onSubToggle,
  onClosePopover,
  onRemove,
}: {
  fault: FaultType;
  active: boolean;
  selectedSubs: string[];
  popoverOpen: boolean;
  onMainClick: () => void;
  onSubToggle: (subKey: string) => void;
  onClosePopover: () => void;
  onRemove: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hasSubs = fault.subTypes && fault.subTypes.length > 0;
  const subCount = selectedSubs.filter((k) => k !== "_self").length;

  const [panelPos, setPanelPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (!popoverOpen || !hasSubs || !wrapRef.current) {
      setPanelPos(null);
      return;
    }

    function updatePosition() {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const panelWidth = 192;
      const margin = 8;
      let left = r.left;
      left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

      const spaceBelow = window.innerHeight - r.bottom - margin;
      const spaceAbove = r.top - margin;
      const maxPreferred = Math.min(320, window.innerHeight * 0.45);
      let top = r.bottom + 4;
      let maxHeight = Math.min(maxPreferred, spaceBelow);

      if (spaceBelow < 160 && spaceAbove > spaceBelow) {
        const approxHeight = Math.min(maxPreferred, spaceAbove - 4);
        top = r.top - approxHeight - 4;
        maxHeight = approxHeight;
      }

      if (top + maxHeight > window.innerHeight - margin) {
        maxHeight = Math.max(120, window.innerHeight - margin - top);
      }
      if (top < margin) {
        top = margin;
        maxHeight = Math.min(maxHeight, Math.max(120, r.top - margin - 4));
      }

      setPanelPos({ top, left, maxHeight: Math.max(120, maxHeight) });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [popoverOpen, hasSubs]);

  useEffect(() => {
    if (!popoverOpen) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClosePopover();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popoverOpen, onClosePopover]);

  const panelContent =
    popoverOpen && hasSubs && panelPos ? (
      <div
        ref={panelRef}
        className="fixed z-[100] w-48 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        style={{
          top: panelPos.top,
          left: panelPos.left,
          maxHeight: panelPos.maxHeight,
          overflowY: "auto",
        }}
      >
        <button
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
            selectedSubs.includes("_self") ? "bg-primary-2 text-primary" : "text-neutral-500 hover:bg-muted"
          }`}
          onClick={() => onSubToggle("_self")}
          type="button"
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              selectedSubs.includes("_self") ? "border-primary bg-primary text-white" : "border-neutral-300"
            }`}
          >
            {selectedSubs.includes("_self") && (
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </span>
          <span>不细分</span>
        </button>
        <div className="my-1 border-t border-border" />
        {fault.subTypes!.map((sub) => {
          const checked = selectedSubs.includes(sub.key);
          return (
            <button
              key={sub.key}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                checked ? "bg-primary-2 text-primary" : "text-neutral-700 hover:bg-muted"
              }`}
              onClick={() => onSubToggle(sub.key)}
              type="button"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checked ? "border-primary bg-primary text-white" : "border-neutral-300"
                }`}
              >
                {checked && (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </span>
              <span>{sub.label}</span>
            </button>
          );
        })}
        <div className="mt-1 border-t border-border pt-1">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50"
            onClick={onRemove}
            type="button"
          >
            取消选择
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        className={`flex min-h-[36px] w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
          active
            ? "border-primary bg-primary-2 text-primary"
            : "border-border bg-surface-2 text-neutral-600 hover:bg-muted"
        }`}
        onClick={onMainClick}
        type="button"
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">{fault.icon}</span>
        <span className="text-xs leading-tight">{fault.label}</span>
        {hasSubs && subCount > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {subCount}
          </span>
        )}
        {hasSubs && subCount === 0 && (
          <svg className="ml-auto h-3 w-3 shrink-0 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {typeof document !== "undefined" && panelContent ? createPortal(panelContent, document.body) : null}
    </div>
  );
});
