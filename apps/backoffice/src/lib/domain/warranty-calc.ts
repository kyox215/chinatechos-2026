export type WarrantyInfo = {
  isInWarranty: boolean;
  totalDays: number;
  remainingDays: number;
  expiresAt: Date;
};

const WARRANTY_MONTHS: Record<string, number> = {
  "3个月": 3,
  "6个月": 6,
  "12个月": 12,
};

function parseWarrantyMonths(text: string | null | undefined): number | null {
  const s = (text ?? "").trim();
  if (WARRANTY_MONTHS[s] != null) return WARRANTY_MONTHS[s];
  const m = s.match(/^(\d+)\s*个?月$/);
  if (m) return Number(m[1]);
  return null;
}

export function calcWarranty(
  completedAt: string | null | undefined,
  warrantyText: string | null | undefined,
): WarrantyInfo | null {
  if (!completedAt) return null;
  const months = parseWarrantyMonths(warrantyText);
  if (months == null || months <= 0) return null;

  const start = new Date(completedAt);
  if (Number.isNaN(start.getTime())) return null;

  const expiresAt = new Date(start);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const now = new Date();
  const totalMs = expiresAt.getTime() - start.getTime();
  const remainingMs = expiresAt.getTime() - now.getTime();
  const totalDays = Math.round(totalMs / 86_400_000);
  const remainingDays = Math.ceil(remainingMs / 86_400_000);

  return {
    isInWarranty: remainingDays > 0,
    totalDays,
    remainingDays,
    expiresAt,
  };
}
