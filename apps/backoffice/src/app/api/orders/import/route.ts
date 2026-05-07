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
  errors: string[];
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^+\d]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("39") && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith("3") && digits.length >= 9) return `+39${digits}`;
  return `+39${digits}`;
}

function parseRows(sheetData: unknown[][]): { rows: ParsedRow[]; headerIssue: string | null } {
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

    const errors: string[] = [];
    if (!phone) errors.push("缺少电话");
    if (!brand) errors.push("缺少品牌");
    if (!model) errors.push("缺少型号");
    if (!issue) errors.push("缺少问题描述");

    const qn = quotationRaw != null ? Number(quotationRaw) : null;
    const dn = depositRaw != null ? Number(depositRaw) : null;

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
      errors,
    });
  }

  return { rows, headerIssue: null };
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
  const { rows, headerIssue } = parseRows(sheetData);

  if (headerIssue) {
    return NextResponse.json({ error: headerIssue }, { status: 400 });
  }

  if (mode === "preview") {
    const preview = rows.slice(0, 50).map((r) => ({
      rowNum: r.rowNum,
      customerPhone: r.customerPhone,
      customerName: r.customerName,
      brand: r.brand,
      model: r.model,
      issueDescription: r.issueDescription.slice(0, 60),
      quotationAmount: r.quotationAmount,
      errors: r.errors,
    }));

    const totalErrors = rows.filter((r) => r.errors.length > 0).length;

    return NextResponse.json({
      ok: true,
      mode: "preview",
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

  let imported = 0;
  let skipped = 0;
  const importErrors: { rowNum: number; error: string }[] = [];

  for (const row of rows) {
    if (row.errors.length > 0) {
      skipped++;
      continue;
    }

    try {
      const phoneE164 = normalizePhone(row.customerPhone);

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
            phone_raw: row.customerPhone,
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

      const publicNo = await generatePublicNo(storeCode);
      const quotation = row.quotationAmount ?? 0;
      const deposit = row.depositAmount ?? 0;
      const balance = Math.max(0, quotation - deposit);

      const orderRes = await supabase
        .from("repair_orders")
        .insert({
          store_id: storeId,
          public_no: publicNo,
          order_type: "dropoff_repair",
          status: "new",
          customer_id: customerId,
          device_id: deviceId,
          issue_description: row.issueDescription,
          quotation_amount: row.quotationAmount,
          deposit_amount: row.depositAmount,
          balance_amount: balance || null,
          technician_name: row.technicianName || null,
          warranty_text: row.warrantyText,
        })
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
    imported,
    skipped,
    errors: importErrors.length,
    errorDetails: importErrors.slice(0, 20),
  });
}
