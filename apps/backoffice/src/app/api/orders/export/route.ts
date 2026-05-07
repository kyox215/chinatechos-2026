import { NextRequest, NextResponse } from "next/server";
import { resolveStoreId } from "@/lib/env/resolve-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const STATUS_LABELS: Record<string, string> = {
  new: "接单",
  diagnosing: "检测中",
  quoted: "已报价",
  waiting_approval: "等回复",
  repairing: "维修中",
  parts_ordered: "等配件",
  parts_arrived: "到货",
  repaired: "修好",
  notified: "已通知",
  completed: "已完成",
  cancelled: "已取消",
};

const COLUMNS = [
  "工单号",
  "状态",
  "客户姓名",
  "电话",
  "品牌",
  "型号",
  "IMEI/SN",
  "问题描述",
  "报价(€)",
  "定金(€)",
  "余额(€)",
  "已结清",
  "技师",
  "保修",
  "配件来源",
  "创建时间",
  "完成时间",
];

export async function GET(request: NextRequest) {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "无法确定门店" }, { status: 500 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "xlsx";
  const status = request.nextUrl.searchParams.get("status");

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("repair_orders")
    .select(`
      public_no, status, issue_description, quotation_amount, deposit_amount,
      balance_amount, is_paid, technician_name, warranty_text, created_at, completed_at,
      customers:customer_id ( name, phone_e164 ),
      devices:device_id ( brand, model, serial_or_imei ),
      suppliers:supplier_id ( short_name )
    `)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const device = Array.isArray(row.devices) ? row.devices[0] : row.devices;
    const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers;

    return [
      row.public_no,
      STATUS_LABELS[row.status] ?? row.status,
      customer?.name ?? "",
      customer?.phone_e164 ?? "",
      device?.brand ?? "",
      device?.model ?? "",
      device?.serial_or_imei ?? "",
      row.issue_description ?? "",
      row.quotation_amount ?? "",
      row.deposit_amount ?? "",
      row.balance_amount ?? "",
      row.is_paid ? "是" : "否",
      row.technician_name ?? "",
      row.warranty_text ?? "",
      supplier?.short_name ?? "",
      row.created_at ? new Date(row.created_at).toLocaleString("it-IT") : "",
      row.completed_at ? new Date(row.completed_at).toLocaleString("it-IT") : "",
    ];
  });

  const wsData = [COLUMNS, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = COLUMNS.map((_, ci) => {
    let max = COLUMNS[ci].length;
    for (const row of rows) {
      const len = String(row[ci] ?? "").length;
      if (len > max) max = len;
    }
    return { wch: Math.min(max + 2, 50) };
  });
  ws["!cols"] = colWidths;

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-export.csv"`,
      },
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "工单");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="orders-export.xlsx"`,
    },
  });
}
