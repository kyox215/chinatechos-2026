"use client";

import { useRef, useState } from "react";

type PreviewRow = {
  rowNum: number;
  customerPhone: string;
  customerName: string;
  brand: string;
  model: string;
  issueDescription: string;
  quotationAmount: number | null;
  status?: string;
  createdAt?: string;
  errors: string[];
};

type PreviewResult = {
  totalRows: number;
  errorRows: number;
  validRows: number;
  isLegacy?: boolean;
  preview: PreviewRow[];
};

type ConfirmResult = {
  imported: number;
  skipped: number;
  errors: number;
  errorDetails: { rowNum: number; error: string }[];
};

export function ImportSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", "preview");
      const res = await fetch("/api/orders/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "解析失败");
      setPreview(data as PreviewResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", "confirm");
      const res = await fetch("/api/orders/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "导入失败");
      setResult(data as ConfirmResult);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">数据导入</h2>
      <p className="mb-3 text-xs text-neutral-500">
        上传 Excel (.xlsx) 或 CSV 文件批量导入工单。文件需包含表头行，至少含：客户电话、品牌、型号、问题描述。
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setPreview(null);
            setResult(null);
            setError(null);
          }}
          type="file"
        />
        <button
          className="ui-btn ui-btn-secondary h-9 px-3 text-xs"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {file ? file.name : "选择文件"}
        </button>
        {file && !preview && !result && (
          <button
            className="ui-btn ui-btn-primary h-9 px-4 text-xs disabled:opacity-60"
            disabled={loading}
            onClick={handlePreview}
            type="button"
          >
            {loading ? "解析中..." : "解析预览"}
          </button>
        )}
      </div>

      {error && <div className="mt-3 text-xs text-rose-600">{error}</div>}

      {preview && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-700">
              共 {preview.totalRows} 行
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
              有效 {preview.validRows} 行
            </span>
            {preview.errorRows > 0 && (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">
                错误 {preview.errorRows} 行（将跳过）
              </span>
            )}
            {preview.isLegacy && (
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">
                旧格式（自动映射状态+日期）
              </span>
            )}
          </div>

          <div className="max-h-64 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">行</th>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">电话</th>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">姓名</th>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">品牌</th>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">型号</th>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">问题</th>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">状态</th>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">日期</th>
                  <th className="px-2 py-1.5 text-left font-medium text-neutral-500">校验</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((r) => (
                  <tr key={r.rowNum} className={r.errors.length > 0 ? "bg-rose-50" : ""}>
                    <td className="px-2 py-1 text-neutral-400">{r.rowNum}</td>
                    <td className="px-2 py-1">{r.customerPhone || "-"}</td>
                    <td className="px-2 py-1">{r.customerName || "-"}</td>
                    <td className="px-2 py-1">{r.brand}</td>
                    <td className="px-2 py-1">{r.model}</td>
                    <td className="max-w-[200px] truncate px-2 py-1">{r.issueDescription}</td>
                    <td className="px-2 py-1 text-neutral-600">{r.status ?? "-"}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-neutral-500">{r.createdAt ?? "-"}</td>
                    <td className="px-2 py-1">
                      {r.errors.length > 0 ? (
                        <span className="text-rose-600">{r.errors.join(", ")}</span>
                      ) : (
                        <span className="text-emerald-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              className="ui-btn ui-btn-primary h-9 px-4 text-xs disabled:opacity-60"
              disabled={loading || preview.validRows === 0}
              onClick={handleConfirm}
              type="button"
            >
              {loading ? "导入中..." : `确认导入 ${preview.validRows} 条`}
            </button>
            <button
              className="ui-btn ui-btn-secondary h-9 px-3 text-xs"
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <div className="font-medium text-emerald-800">导入完成</div>
          <div className="text-emerald-700">
            成功导入 {result.imported} 条，跳过 {result.skipped} 条
            {result.errors > 0 && `，失败 ${result.errors} 条`}
          </div>
          {result.errorDetails.length > 0 && (
            <div className="mt-1 space-y-0.5 text-rose-600">
              {result.errorDetails.map((e) => (
                <div key={e.rowNum}>行 {e.rowNum}: {e.error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
