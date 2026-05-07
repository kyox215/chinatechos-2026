import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generatePublicNo } from "@/lib/domain/public-no";
import * as XLSX from "xlsx";

const EXPECTED_HEADERS = [
  "客户电话",
  "客户姓名",
  "品牌",
  "型号",
  "问题描述",
];

// Legacy Italian format mappings (from ChinaTech_RIPARAZIONE)
const LEGACY_STATUS_MAP: Record<string, string> = {
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

const LEGACY_ORDER_TYPE_MAP: Record<string, string> = {
  "RIPARAZIONE VELOCE": "quick_repair",
  LASCIATTO: "dropoff_repair",
  "NON LASCIATTO": "dropoff_repair",
};

const LEGACY_WARRANTY_MAP: Record<string, string> = {
  "6 MESI": "6个月",
  "3 MESI": "3个月",
  "NO GARANZIA": "无保修",
  "USATO GARANZIA": "二手保修",
};

type ParsedRow = {
  rowNum: number;
  customerPhone: string;
  customerName: string;
  brand: string;
  model: string;
  serialOrImei: string;
  issueDescription: string;
  quotationAmount: number | null;
  depositAmount: number | null;
  technicianName: string;
  warrantyText: string;
  status: string;
  orderType: string;
  createdAt: string | null;
  completedAt: string | null;
  supplierShortName: string | null;
  internalTag: string | null;
  cancelReason: string | null;
  errors: string[];
};

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s/\-()]/g, "").trim();
  if (!cleaned || /^0+$/.test(cleaned) || !/\d{3}/.test(cleaned)) {
    return `+39${cleaned}`;
  }
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00") && cleaned.length > 10) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("39") && cleaned.length >= 11 && cleaned.length <= 13) return `+${cleaned}`;
  if (cleaned.startsWith("3") && cleaned.length >= 9 && cleaned.length <= 11) return `+39${cleaned}`;
  if (cleaned.startsWith("0") && cleaned.length >= 8 && cleaned.length <= 11) return `+39${cleaned}`;
  if (/^\d{10,15}$/.test(cleaned)) return `+${cleaned}`;
  return `+39${cleaned}`;
}

function isValidPhone(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = String(raw).trim();
  return s.length >= 3 && /\d{3}/.test(s);
}

function toISOString(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/**
 * Detect whether the sheet uses the legacy Italian column layout
 * (STATO, NOME, OGGETTO, ... by positional index rather than header names).
 */
function isLegacyFormat(headers: string[]): boolean {
  const joined = headers.join("|").toUpperCase();
  return (
    joined.includes("STATO") &&
    (joined.includes("MARCA") || joined.includes("MODELLO") || joined.includes("PROBLEMA"))
  );
}

function parseLegacyRows(sheetData: unknown[][]): { rows: ParsedRow[]; headerIssue: string | null } {
  if (sheetData.length <= 1) return { rows: [], headerIssue: "文件为空" };

  const headers = sheetData[0].map((h) => String(h ?? "").trim().toUpperCase());

  const statoIdx = headers.findIndex((h) => h === "STATO" || h === "状态");
  const nomeIdx = headers.findIndex((h) => h === "NOME" || h === "姓名" || h === "客户姓名");
  const oggettoIdx = headers.findIndex((h) => h === "OGGETTO" || h === "类型");
  const daRiparareIdx = headers.findIndex((h) => /DA RIPARARE|待修/i.test(h));
  const phoneIdx = headers.findIndex((h) => /TELEFONO|电话|TEL/i.test(h));
  const prezzoIdx = headers.findIndex((h) => /PREZZO|TOTALE|价格|报价/i.test(h));
  const accontoIdx = headers.findIndex((h) => /ACCONTO|定金|DEPOSIT/i.test(h));
  const marcaIdx = headers.findIndex((h) => /MARCA|品牌|BRAND/i.test(h));
  const modelloIdx = headers.findIndex((h) => /MODELLO|型号|MODEL/i.test(h));
  const problemaIdx = headers.findIndex((h) => /PROBLEMA|问题|ISSUE/i.test(h));
  const kIdx = headers.findIndex((h) => h === "K" || /供应商|SUPPLIER/i.test(h));
  const garanziaIdx = headers.findIndex((h) => /GARANZIA|保修|WARRANTY/i.test(h));
  const dataRitiroIdx = headers.findIndex((h) => /DATA RITIRO|取件日期|PICKUP/i.test(h));
  const dataAggiuntaIdx = headers.findIndex((h) => /DATA AGGIUNTA|创建日期|CREATED|DATE/i.test(h));
  const tecnicoIdx = headers.findIndex((h) => /TECNICO|技师|TECH/i.test(h));
  const imeiIdx = headers.findIndex((h) => /S\/N|IMEI|SERIAL/i.test(h));

  const rows: ParsedRow[] = [];
  for (let i = 1; i < sheetData.length; i++) {
    const r = sheetData[i] as unknown[];
    if (!r || r.every((c) => c == null || String(c).trim() === "")) continue;

    const statoRaw = statoIdx >= 0 ? str(r[statoIdx]) : "";
    const nome = nomeIdx >= 0 ? str(r[nomeIdx]) : "";
    const oggettoRaw = oggettoIdx >= 0 ? str(r[oggettoIdx]) : "";
    const daRiparare = daRiparareIdx >= 0 ? str(r[daRiparareIdx]) : "";
    const phoneRaw = phoneIdx >= 0 ? str(r[phoneIdx]) : "";
    const prezzoTotale = prezzoIdx >= 0 ? num(r[prezzoIdx]) : null;
    const acconto = accontoIdx >= 0 ? num(r[accontoIdx]) : null;
    const marca = marcaIdx >= 0 ? str(r[marcaIdx]) : "";
    const modello = modelloIdx >= 0 ? str(r[modelloIdx]) : "";
    const problema = problemaIdx >= 0 ? str(r[problemaIdx]) : "";
    const kCol = kIdx >= 0 ? str(r[kIdx]) : "";
    const garanzia = garanziaIdx >= 0 ? str(r[garanziaIdx]) : "";
    const dataRitiro = dataRitiroIdx >= 0 ? toISOString(r[dataRitiroIdx]) : null;
    const dataAggiunta = dataAggiuntaIdx >= 0 ? toISOString(r[dataAggiuntaIdx]) : null;
    const tecnico = tecnicoIdx >= 0 ? str(r[tecnicoIdx]) : "";
    const snImei = imeiIdx >= 0 ? str(r[imeiIdx]) : "";

    const status = LEGACY_STATUS_MAP[statoRaw] ?? "completed";
    const orderType = LEGACY_ORDER_TYPE_MAP[oggettoRaw] ?? "dropoff_repair";
    const warrantyText = LEGACY_WARRANTY_MAP[garanzia] ?? (garanzia || "6个月");
    const quotation = prezzoTotale ?? 0;
    const deposit = acconto ?? 0;
    const isPaid = status === "completed";

    const supplierShortName = kCol && kCol !== "-" && kCol.toUpperCase() !== "NONE"
      ? kCol.toUpperCase()
      : null;

    const errors: string[] = [];
    if (!phoneRaw && !nome) errors.push("缺少电话和姓名");

    const completedAt = status === "completed" ? (dataRitiro || dataAggiunta) : null;
    const cancelReason = status === "cancelled" ? "旧系统迁移-作废" : null;

    const internalTag = [daRiparare, supplierShortName ? kCol : null]
      .filter(Boolean)
      .join("; ") || null;

    rows.push({
      rowNum: i + 1,
      customerPhone: phoneRaw,
      customerName: nome,
      brand: marca || "Sconosciuto",
      model: modello || "Sconosciuto",
      serialOrImei: snImei,
      issueDescription: problema || "-",
      quotationAmount: prezzoTotale,
      depositAmount: acconto,
      technicianName: tecnico,
      warrantyText,
      status,
      orderType,
      createdAt: dataAggiunta,
      completedAt,
      supplierShortName,
      internalTag,
      cancelReason,
      errors,
    });
  }

  return { rows, headerIssue: null };
}

function parseStandardRows(sheetData: unknown[][]): { rows: ParsedRow[]; headerIssue: string | null } {
  if (sheetData.length === 0) {
    return { rows: [], headerIssue: "文件为空" };
  }

  const headers = sheetData[0].map((h) => String(h ?? "").trim());

  const phoneIdx = headers.findIndex((h) => /电话|phone|telefono/i.test(h));
  const nameIdx = headers.findIndex((h) => /姓名|客户|nome|name/i.test(h));
  const brandIdx = headers.findIndex((h) => /品牌|marca|brand/i.test(h));
  const modelIdx = headers.findIndex((h) => /型号|modello|model/i.test(h));
  const issueIdx = headers.findIndex((h) => /问题|描述|problema|issue|problem/i.test(h));
  const quotationIdx = headers.findIndex((h) => /报价|价格|prezzo|price|totale/i.test(h));
  const depositIdx = headers.findIndex((h) => /定金|acconto|deposit/i.test(h));
  const techIdx = headers.findIndex((h) => /技师|tecnico|technician/i.test(h));
  const warrantyIdx = headers.findIndex((h) => /保修|garanzia|warranty/i.test(h));
  const imeiIdx = headers.findIndex((h) => /imei|s\/n|serial/i.test(h));
  const statusIdx = headers.findIndex((h) => /^状态$|^status$/i.test(h));
  const createdIdx = headers.findIndex((h) => /创建时间|created|data aggiunta/i.test(h));
  const completedIdx = headers.findIndex((h) => /完成时间|completed|data ritiro/i.test(h));

  if (phoneIdx === -1 && brandIdx === -1 && issueIdx === -1) {
    return {
      rows: [],
      headerIssue: `无法识别表头。需要至少包含以下列之一：${EXPECTED_HEADERS.join("、")}`,
    };
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < sheetData.length; i++) {
    const r = sheetData[i];
    if (!r || r.every((c) => c == null || String(c).trim() === "")) continue;

    const phone = phoneIdx >= 0 ? String(r[phoneIdx] ?? "").trim() : "";
    const name = nameIdx >= 0 ? String(r[nameIdx] ?? "").trim() : "";
    const brand = brandIdx >= 0 ? String(r[brandIdx] ?? "").trim() : "";
    const model = modelIdx >= 0 ? String(r[modelIdx] ?? "").trim() : "";
    const issue = issueIdx >= 0 ? String(r[issueIdx] ?? "").trim() : "";
    const quotationRaw = quotationIdx >= 0 ? r[quotationIdx] : null;
    const depositRaw = depositIdx >= 0 ? r[depositIdx] : null;
    const tech = techIdx >= 0 ? String(r[techIdx] ?? "").trim() : "";
    const warranty = warrantyIdx >= 0 ? String(r[warrantyIdx] ?? "").trim() : "6个月";
    const imei = imeiIdx >= 0 ? String(r[imeiIdx] ?? "").trim() : "";
    const statusRaw = statusIdx >= 0 ? String(r[statusIdx] ?? "").trim() : "";
    const createdRaw = createdIdx >= 0 ? toISOString(r[createdIdx]) : null;
    const completedRaw = completedIdx >= 0 ? toISOString(r[completedIdx]) : null;

    const errors: string[] = [];
    if (!phone) errors.push("缺少电话");
    if (!brand) errors.push("缺少品牌");
    if (!model) errors.push("缺少型号");
    if (!issue) errors.push("缺少问题描述");

    const qn = quotationRaw != null ? Number(quotationRaw) : null;
    const dn = depositRaw != null ? Number(depositRaw) : null;

    const resolvedStatus = LEGACY_STATUS_MAP[statusRaw] ?? (statusRaw || "new");

    rows.push({
      rowNum: i + 1,
      customerPhone: phone,
      customerName: name,
      brand: brand || "Sconosciuto",
      model: model || "Sconosciuto",
      serialOrImei: imei,
      issueDescription: issue || "-",
      quotationAmount: qn != null && Number.isFinite(qn) ? Math.round(qn * 100) / 100 : null,
      depositAmount: dn != null && Number.isFinite(dn) ? Math.round(dn * 100) / 100 : null,
      technicianName: tech,
      warrantyText: warranty || "6个月",
      status: resolvedStatus,
      orderType: "dropoff_repair",
      createdAt: createdRaw,
      completedAt: completedRaw,
      supplierShortName: null,
      internalTag: null,
      cancelReason: resolvedStatus === "cancelled" ? "导入-作废" : null,
      errors,
    });
  }

  return { rows, headerIssue: null };
}

function parseRows(sheetData: unknown[][]): { rows: ParsedRow[]; headerIssue: string | null; isLegacy: boolean } {
  if (sheetData.length === 0) {
    return { rows: [], headerIssue: "文件为空", isLegacy: false };
  }

  const headers = sheetData[0].map((h) => String(h ?? "").trim());
  const legacy = isLegacyFormat(headers);

  if (legacy) {
    const result = parseLegacyRows(sheetData);
    return { ...result, isLegacy: true };
  }

  const result = parseStandardRows(sheetData);
  return { ...result, isLegacy: false };
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

export async function POST(request: NextRequest) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "需要 multipart/form-data 上传" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const mode = String(formData.get("mode") ?? "preview");

  if (!file) {
    return NextResponse.json({ error: "未上传文件" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
    return NextResponse.json({ error: "仅支持 .xlsx / .xls / .csv 文件" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", dateNF: "yyyy-mm-dd" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    return NextResponse.json({ error: "文件中无数据表" }, { status: 400 });
  }

  const sheetData = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
  const { rows, headerIssue, isLegacy } = parseRows(sheetData);

  if (headerIssue) {
    return NextResponse.json({ error: headerIssue }, { status: 400 });
  }

  if (mode === "preview") {
    const statusLabels: Record<string, string> = {
      new: "接单", diagnosing: "检测中", quoted: "已报价",
      waiting_approval: "等回复", repairing: "维修中", parts_ordered: "等配件",
      parts_arrived: "到货", repaired: "修好", notified: "已通知",
      completed: "已完成", cancelled: "已取消",
    };

    const preview = rows.slice(0, 50).map((r) => ({
      rowNum: r.rowNum,
      customerPhone: r.customerPhone,
      customerName: r.customerName,
      brand: r.brand,
      model: r.model,
      issueDescription: r.issueDescription.slice(0, 60),
      quotationAmount: r.quotationAmount,
      status: statusLabels[r.status] ?? r.status,
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString("it-IT") : "-",
      errors: r.errors,
    }));

    const totalErrors = rows.filter((r) => r.errors.length > 0).length;

    return NextResponse.json({
      ok: true,
      mode: "preview",
      isLegacy,
      totalRows: rows.length,
      errorRows: totalErrors,
      validRows: rows.length - totalErrors,
      preview,
    });
  }

  // mode === "confirm" — actually import
  const supabase = createSupabaseServerClient();

  const storeRes = await supabase
    .from("stores")
    .select("store_code")
    .eq("id", storeId)
    .single();
  if (storeRes.error || !storeRes.data) {
    return NextResponse.json({ error: "门店不存在" }, { status: 500 });
  }
  const storeCode = storeRes.data.store_code;

  // For legacy format, pre-create suppliers
  const supplierMap = new Map<string, string>();
  if (isLegacy) {
    const supplierNames = new Set<string>();
    for (const row of rows) {
      if (row.supplierShortName) supplierNames.add(row.supplierShortName);
    }
    for (const shortName of supplierNames) {
      const existing = await supabase
        .from("suppliers")
        .select("id")
        .eq("store_id", storeId)
        .eq("short_name", shortName)
        .maybeSingle();
      if (existing.data) {
        supplierMap.set(shortName, existing.data.id);
      } else {
        const ins = await supabase
          .from("suppliers")
          .insert({ store_id: storeId, name: shortName, short_name: shortName, color: "gray" })
          .select("id")
          .single();
        if (ins.data) supplierMap.set(shortName, ins.data.id);
      }
    }
  }

  let imported = 0;
  let skipped = 0;
  const importErrors: { rowNum: number; error: string }[] = [];

  for (const row of rows) {
    if (row.errors.length > 0) {
      skipped++;
      continue;
    }

    try {
      let phoneE164: string;
      if (!isValidPhone(row.customerPhone)) {
        phoneE164 = `+39000000${String(row.rowNum).padStart(4, "0")}`;
      } else {
        phoneE164 = normalizePhone(row.customerPhone);
      }

      // Upsert customer
      let customerId: string;
      const existingCustomer = await supabase
        .from("customers")
        .select("id")
        .eq("store_id", storeId)
        .eq("phone_e164", phoneE164)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingCustomer.data) {
        customerId = existingCustomer.data.id;
      } else {
        const ins = await supabase
          .from("customers")
          .insert({
            store_id: storeId,
            name: row.customerName || null,
            phone_raw: row.customerPhone || null,
            phone_e164: phoneE164,
          })
          .select("id")
          .single();
        if (ins.error) throw new Error(`客户: ${ins.error.message}`);
        customerId = ins.data.id;
      }

      // Upsert device
      let deviceId: string;
      const existingDevice = await supabase
        .from("devices")
        .select("id")
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .eq("brand", row.brand)
        .eq("model", row.model)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingDevice.data) {
        deviceId = existingDevice.data.id;
      } else {
        const ins = await supabase
          .from("devices")
          .insert({
            store_id: storeId,
            customer_id: customerId,
            brand: row.brand,
            model: row.model,
            serial_or_imei: row.serialOrImei || null,
          })
          .select("id")
          .single();
        if (ins.error) throw new Error(`设备: ${ins.error.message}`);
        deviceId = ins.data.id;
      }

      const publicNo = isLegacy
        ? generateLegacyPublicNo(row.createdAt, row.rowNum)
        : await generatePublicNo(storeCode);

      const quotation = row.quotationAmount ?? 0;
      const deposit = row.depositAmount ?? 0;
      const balance = Math.max(0, quotation - deposit);
      const isPaid = row.status === "completed";

      const now = new Date().toISOString();
      const createdAt = row.createdAt || now;
      const completedAt = row.completedAt || null;
      const deliveredAt = row.status === "completed" ? (completedAt || createdAt) : null;

      const orderInsert: Record<string, unknown> = {
        store_id: storeId,
        public_no: publicNo,
        order_type: row.orderType,
        status: row.status,
        customer_id: customerId,
        device_id: deviceId,
        issue_description: row.issueDescription,
        quotation_amount: row.quotationAmount,
        deposit_amount: row.depositAmount,
        balance_amount: isPaid ? 0 : (balance || null),
        is_paid: isPaid,
        technician_name: row.technicianName || null,
        warranty_text: row.warrantyText,
        created_at: createdAt,
        updated_at: createdAt,
      };

      if (completedAt) orderInsert.completed_at = completedAt;
      if (deliveredAt) orderInsert.delivered_at = deliveredAt;
      if (row.cancelReason) orderInsert.cancel_reason = row.cancelReason;
      if (row.internalTag) orderInsert.internal_tag = row.internalTag;

      if (row.supplierShortName && supplierMap.has(row.supplierShortName)) {
        orderInsert.supplier_id = supplierMap.get(row.supplierShortName);
      }

      const orderRes = await supabase
        .from("repair_orders")
        .insert(orderInsert)
        .select("id")
        .single();

      if (orderRes.error) throw new Error(`工单: ${orderRes.error.message}`);

      imported++;
    } catch (e) {
      importErrors.push({
        rowNum: row.rowNum,
        error: e instanceof Error ? e.message : "未知错误",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    mode: "confirm",
    isLegacy,
    imported,
    skipped,
    errors: importErrors.length,
    errorDetails: importErrors.slice(0, 20),
  });
}
