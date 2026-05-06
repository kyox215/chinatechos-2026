import { SUPPLIER_PALETTE } from "@/components/orders/supplier-palette";

export type SupplierBadgeProps = {
  name: string;
  color?: string | null;
  size?: "sm" | "xs";
};

/** Colored pill for supplier short name; shared by order list and detail. */
export function SupplierBadge({ name, color, size = "xs" }: SupplierBadgeProps) {
  const c = SUPPLIER_PALETTE[color ?? "blue"] ?? SUPPLIER_PALETTE.blue;
  const textCls = size === "sm" ? "text-xs" : "text-[10px]";
  return (
    <span
      className={`inline-flex max-w-full shrink-0 truncate rounded px-1.5 py-0.5 font-medium ${textCls} ${c.bg} ${c.text}`}
      title={name}
    >
      {name}
    </span>
  );
}
