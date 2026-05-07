/**
 * Normalize raw scanner output before lookup (trim, single line).
 */
export function normalizeScanInput(raw: string): string {
  return raw.trim().split(/\r?\n/)[0]?.trim() ?? "";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

/** Extract last path segment if input looks like http(s) URL. */
export function tryExtractUrlLastSegment(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    return last || null;
  } catch {
    return null;
  }
}
