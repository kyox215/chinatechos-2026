/**
 * Shared rules for PostgREST `.or()` / `ilike` filter strings.
 * All user-provided search text for Supabase filters should go through here.
 */

export const POSTGREST_SEARCH_MAX_LEN = 200;

/**
 * Safe fragment for PostgREST `ilike` patterns inside `.or(...)`.
 * - Strip `,` `%` `\` `"` `()` — break CSV-like filter syntax or user-injected wildcards.
 * - Strip `+` — PostgREST logic tree treats `+` as boolean OR (breaks phone `+39…` searches).
 * - Keep `_` — IMEI 等；在 SQL ILIKE 中 `_` 为单字符通配符。
 */
export function sanitizePostgrestSearchTerm(raw: string): string {
  return raw
    .trim()
    .slice(0, POSTGREST_SEARCH_MAX_LEN)
    .replace(/\\/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\+/g, "")
    .replace(/[()]/g, "")
    .replace(/"/g, "");
}

/** PostgREST filter value: quote so `.` and other chars do not break `col.op.value` parsing. */
export function postgrestQuoted(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** 与 `sanitizePostgrestSearchTerm` 相同，保留兼容导出 */
export const sanitizeOrderSearchQ = sanitizePostgrestSearchTerm;
