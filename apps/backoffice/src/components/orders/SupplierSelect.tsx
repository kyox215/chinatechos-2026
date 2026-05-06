"use client";

import { useEffect, useState } from "react";

/** Row shape returned by GET /api/suppliers */
export type SupplierSelectOption = { id: string; short_name: string; color: string };

type Props = {
  value: string;
  onChange: (supplierId: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  /**
   * When provided (including empty array), skips network fetch and uses these options.
   * Pass `undefined` to load from `/api/suppliers` on mount.
   */
  options?: SupplierSelectOption[];
  emptyLabel?: string;
};

/** Store-scoped supplier dropdown; reusable on order edit and status flows. */
export function SupplierSelect({
  value,
  onChange,
  disabled,
  className,
  id,
  options,
  emptyLabel = "未选择供应商",
}: Props) {
  const [items, setItems] = useState<SupplierSelectOption[]>(options ?? []);
  const [ready, setReady] = useState(options !== undefined);

  useEffect(() => {
    if (options !== undefined) {
      setItems(options);
      setReady(true);
      return;
    }
    let cancelled = false;
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d: { items?: SupplierSelectOption[] }) => {
        if (!cancelled) {
          setItems(d.items ?? []);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [options]);

  return (
    <select
      id={id}
      className={className ?? "ui-input w-full text-xs"}
      disabled={disabled || !ready}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {items.map((s) => (
        <option key={s.id} value={s.id}>
          {s.short_name}
        </option>
      ))}
    </select>
  );
}
