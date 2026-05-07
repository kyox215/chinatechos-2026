/**
 * One-time legacy data import: ChinaTech_RIPARAZIONE.xlsx → Supabase
 *
 * Usage:
 *   npx tsx scripts/import-legacy-xlsx.ts --dry-run   # preview only
 *   npx tsx scripts/import-legacy-xlsx.ts              # actual import
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_STORE_ID
 */

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as fs from "fs";

// ── Config ──────────────────────────────────────────────────────────────────

const XLSX_PATH = path.resolve(__dirname, "../旧表格数据/ChinaTech_RIPARAZIONE (1).xlsx");
const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORE_ID = process.env.DEFAULT_STORE_ID!;

if (!SUPABASE_URL || !SUPABASE_KEY || !STORE_ID) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_STORE_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Mappings ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  FATTO: "completed",
  "作废": "cancelled",
  "作废已通知": "cancelled",
  "IN CORSO": "repairing",
  "寄修": "repairing",
  "下单": "parts_ordered",
  "久等 未答复": "waiting_approval",
  "修好": "repaired",
  "修好已通知": "notified",
  "到货": "parts_arrived",
  "到货已通知": "parts_arrived",
};

const ORDER_TYPE_MAP: Record<string, string> = {
  "RIPARAZIONE VELOCE": "quick_repair",
  LASCIATTO: "dropoff_repair",
  "NON LASCIATTO": "dropoff_repair",
};

const WARRANTY_MAP: Record<string, string> = {
  "6 MESI": "6个月",
  "3 MESI": "3个月",
  "NO GARANZIA": "无保修",
  "USATO GARANZIA": "二手保修",
};

// ── Phone normalization ─────────────────────────────────────────────────────

function normalizePhone(raw: string): { phoneE164: string; phoneRaw: string } {
  const cleaned = raw.replace(/[\s/\-()]/g, "").trim();
  if (!cleaned || /^0+$/.test(cleaned) || !/\d{6}/.test(cleaned)) {
    return { phoneE164: cleaned, phoneRaw: raw.trim() };
  }

  if (cleaned.startsWith("+")) {
    return { phoneE164: cleaned, phoneRaw: raw.trim() };
  }
  // 0049... → +49...
  if (cleaned.startsWith("00") && cleaned.length > 10) {
    return { phoneE164: `+${cleaned.slice(2)}`, phoneRaw: raw.trim() };
  }
  // 39xxxxxxxxx (Italian with country code)
  if (cleaned.startsWith("39") && cleaned.length >= 11 && cleaned.length <= 13) {
    return { phoneE164: `+${cleaned}`, phoneRaw: raw.trim() };
  }
  // 3xxxxxxxxx (Italian mobile without country code)
  if (cleaned.startsWith("3") && cleaned.length >= 9 && cleaned.length <= 11) {
    return { phoneE164: `+39${cleaned}`, phoneRaw: raw.trim() };
  }
  // 09xx (Italian landline)
  if (cleaned.startsWith("0") && cleaned.length >= 8 && cleaned.length <= 11) {
    return { phoneE164: `+39${cleaned}`, phoneRaw: raw.trim() };
  }
  // Foreign: 44 xxx (UK etc.)
  if (/^\d{10,15}$/.test(cleaned)) {
    return { phoneE164: `+${cleaned}`, phoneRaw: raw.trim() };
  }

  return { phoneE164: `+39${cleaned}`, phoneRaw: raw.trim() };
}

function isValidPhone(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = String(raw).trim();
  return s.length >= 3 && /\d{3}/.test(s);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function toISOString(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function generateLegacyPublicNo(dateStr: string | null, seq: number): string {
  if (!dateStr) {
    return `LEGACY-000000-${String(seq).padStart(4, "0")}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return `LEGACY-000000-${String(seq).padStart(4, "0")}`;
  }
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `LEGACY-${yy}${mm}${dd}-${String(seq).padStart(4, "0")}`;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE IMPORT"}`);
  console.log(`File: ${XLSX_PATH}`);

  if (!fs.existsSync(XLSX_PATH)) {
    console.error("Excel file not found");
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets["RIPARAZIONE"];
  if (!ws) {
    console.error("Sheet RIPARAZIONE not found");
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd hh:mm:ss" });
  const dataRows = rows.slice(1);
  console.log(`Total rows: ${dataRows.length}`);

  // ── Step 1: Upsert suppliers ──────────────────────────────────────────
  const supplierShortNames = new Set<string>();
  for (const row of dataRows) {
    const r = row as unknown[];
    const k = str(r[10]);
    if (k && k !== "-" && k !== "None") supplierShortNames.add(k.toUpperCase());
  }

  const supplierMap = new Map<string, string>(); // shortName → id
  if (!DRY_RUN) {
    for (const shortName of supplierShortNames) {
      const existing = await supabase
        .from("suppliers")
        .select("id")
        .eq("store_id", STORE_ID)
        .eq("short_name", shortName)
        .maybeSingle();

      if (existing.data) {
        supplierMap.set(shortName, existing.data.id);
      } else {
        const ins = await supabase
          .from("suppliers")
          .insert({
            store_id: STORE_ID,
            name: shortName,
            short_name: shortName,
            color: "gray",
          })
          .select("id")
          .single();
        if (ins.data) supplierMap.set(shortName, ins.data.id);
        else console.warn(`  Failed to create supplier ${shortName}: ${ins.error?.message}`);
      }
    }
  }
  console.log(`Suppliers: ${supplierShortNames.size} unique → ${supplierMap.size} mapped`);

  // ── Step 2: Process rows ──────────────────────────────────────────────
  const customerCache = new Map<string, string>(); // phoneE164 → customerId
  const deviceCache = new Map<string, string>(); // "customerId|brand|model" → deviceId
  const stats = { success: 0, skipped: 0, errors: 0, noPhone: 0 };

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i] as unknown[];
    const rowNum = i + 2;

    try {
      const statoRaw = str(r[0]);
      const nome = str(r[1]);
      const oggettoRaw = str(r[2]);
      const daRiparare = str(r[3]);
      const phoneRaw = str(r[4]);
      const prezzoTotale = num(r[5]);
      const acconto = num(r[6]);
      const marca = str(r[7]) || "Sconosciuto";
      const modello = str(r[8]) || "Sconosciuto";
      const problema = str(r[9]) || "-";
      const kCol = str(r[10]);
      const garanzia = str(r[11]);
      const dataRitiro = toISOString(r[12]);
      const dataAggiunta = toISOString(r[13]);
      const tecnico = str(r[14]);
      const snImei = str(r[15]);

      const status = STATUS_MAP[statoRaw] ?? "completed";
      const orderType = ORDER_TYPE_MAP[oggettoRaw] ?? "dropoff_repair";
      const warrantyText = WARRANTY_MAP[garanzia] ?? garanzia || "6个月";
      const quotation = prezzoTotale ?? 0;
      const deposit = acconto ?? 0;
      const balance = Math.max(0, quotation - deposit);
      const isPaid = status === "completed";
      const supplierShortName = kCol && kCol !== "-" ? kCol.toUpperCase() : null;
      const supplierId = supplierShortName ? (supplierMap.get(supplierShortName) ?? null) : null;

      // Phone handling
      let phoneE164: string;
      let phoneRawNorm: string;
      if (!isValidPhone(phoneRaw)) {
        phoneE164 = `+39000000${String(rowNum).padStart(4, "0")}`;
        phoneRawNorm = phoneRaw || `[无号码-行${rowNum}]`;
        stats.noPhone++;
      } else {
        const pn = normalizePhone(phoneRaw);
        phoneE164 = pn.phoneE164;
        phoneRawNorm = pn.phoneRaw;
      }

      const customerName = nome || (isValidPhone(phoneRaw) ? null : `[无号码-行${rowNum}]`);

      if (DRY_RUN) {
        if (i < 5 || i === dataRows.length - 1) {
          console.log(`  Row ${rowNum}: ${status} | ${customerName ?? "-"} | ${phoneE164} | ${marca} ${modello} | ${problema.slice(0, 40)}`);
        }
        stats.success++;
        continue;
      }

      // ── Upsert customer ──
      let customerId = customerCache.get(phoneE164);
      if (!customerId) {
        const existing = await supabase
          .from("customers")
          .select("id")
          .eq("store_id", STORE_ID)
          .eq("phone_e164", phoneE164)
          .is("deleted_at", null)
          .maybeSingle();

        if (existing.data) {
          customerId = existing.data.id;
        } else {
          const ins = await supabase
            .from("customers")
            .insert({
              store_id: STORE_ID,
              name: customerName,
              phone_raw: phoneRawNorm,
              phone_e164: phoneE164,
            })
            .select("id")
            .single();
          if (ins.error) {
            console.error(`  Row ${rowNum}: customer insert failed: ${ins.error.message}`);
            stats.errors++;
            continue;
          }
          customerId = ins.data.id;
        }
        customerCache.set(phoneE164, customerId);
      }

      // ── Upsert device ──
      const devKey = `${customerId}|${marca}|${modello}`;
      let deviceId = deviceCache.get(devKey);
      if (!deviceId) {
        const existing = await supabase
          .from("devices")
          .select("id")
          .eq("store_id", STORE_ID)
          .eq("customer_id", customerId)
          .eq("brand", marca)
          .eq("model", modello)
          .is("deleted_at", null)
          .maybeSingle();

        if (existing.data) {
          deviceId = existing.data.id;
        } else {
          const ins = await supabase
            .from("devices")
            .insert({
              store_id: STORE_ID,
              customer_id: customerId,
              brand: marca,
              model: modello,
              serial_or_imei: snImei || null,
            })
            .select("id")
            .single();
          if (ins.error) {
            console.error(`  Row ${rowNum}: device insert failed: ${ins.error.message}`);
            stats.errors++;
            continue;
          }
          deviceId = ins.data.id;
        }
        deviceCache.set(devKey, deviceId);
      }

      // ── Create order ──
      const publicNo = generateLegacyPublicNo(dataAggiunta, rowNum);
      const internalTag = [daRiparare, supplierShortName && !supplierId ? kCol : null]
        .filter(Boolean)
        .join("; ") || null;

      const now = new Date().toISOString();
      const createdAt = dataAggiunta || now;
      const completedAt = status === "completed" ? (dataRitiro || createdAt) : null;
      const deliveredAt = status === "completed" ? (dataRitiro || createdAt) : null;
      const cancelReason = status === "cancelled" ? "旧系统迁移-作废" : null;

      const orderInsert: Record<string, unknown> = {
        store_id: STORE_ID,
        public_no: publicNo,
        order_type: orderType,
        status,
        customer_id: customerId,
        device_id: deviceId,
        issue_description: problema,
        quotation_amount: quotation || null,
        deposit_amount: deposit || null,
        balance_amount: isPaid ? 0 : (balance || null),
        is_paid: isPaid,
        technician_name: tecnico || null,
        internal_tag: internalTag,
        warranty_text: warrantyText,
        cancel_reason: cancelReason,
        created_at: createdAt,
        updated_at: createdAt,
      };

      if (completedAt) orderInsert.completed_at = completedAt;
      if (deliveredAt) orderInsert.delivered_at = deliveredAt;
      if (supplierId) orderInsert.supplier_id = supplierId;

      const orderRes = await supabase
        .from("repair_orders")
        .insert(orderInsert)
        .select("id")
        .single();

      if (orderRes.error) {
        console.error(`  Row ${rowNum}: order insert failed: ${orderRes.error.message}`);
        stats.errors++;
        continue;
      }

      stats.success++;
      if (stats.success % 500 === 0) {
        console.log(`  Progress: ${stats.success} / ${dataRows.length}`);
      }
    } catch (e) {
      console.error(`  Row ${rowNum}: unexpected error:`, e);
      stats.errors++;
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`  Success:  ${stats.success}`);
  console.log(`  Errors:   ${stats.errors}`);
  console.log(`  No phone: ${stats.noPhone} (imported with placeholder)`);
  console.log(`  Customers created/reused: ${customerCache.size}`);
  console.log(`  Devices created/reused:   ${deviceCache.size}`);
  console.log(`  Suppliers:                ${supplierMap.size}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
