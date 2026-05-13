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
      <h2 className="mb-3 font-display text-sm font-semibold text-foreground">数据导入</h2>
      <p className="mb-3 text-xs text-muted-foreground">
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

      {error && <div className="mt-3 text-xs text-status-danger-foreground">{error}</div>}

      {preview && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              共 {preview.totalRows} 行
            </span>
            <span className="rounded-full bg-status-success px-2.5 py-1 text-status-success-foreground">
              有效 {preview.validRows} 行
            </span>
            {preview.errorRows > 0 && (
              <span className="rounded-full bg-status-danger px-2.5 py-1 text-status-danger-foreground">
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
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">行</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">电话</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">姓名</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">品牌</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">型号</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">问题</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">状态</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">日期</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">校验</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((r) => (
                  <tr key={r.rowNum} className={r.errors.length > 0 ? "bg-status-danger" : ""}>
                    <td className="px-2 py-1 text-muted-foreground">{r.rowNum}</td>
                    <td className="px-2 py-1">{r.customerPhone || "-"}</td>
                    <td className="px-2 py-1">{r.customerName || "-"}</td>
                    <td className="px-2 py-1">{r.brand}</td>
                    <td className="px-2 py-1">{r.model}</td>
                    <td className="max-w-[200px] truncate px-2 py-1">{r.issueDescription}</td>
                    <td className="px-2 py-1 text-muted-foreground">{r.status ?? "-"}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-muted-foreground">{r.createdAt ?? "-"}</td>
                    <td className="px-2 py-1">
                      {r.errors.length > 0 ? (
                        <span className="text-status-danger-foreground">{r.errors.join(", ")}</span>
                      ) : (
                        <span className="text-status-success-foreground">OK</span>
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
        <div className="mt-4 space-y-2 rounded-xl border border-status-success bg-status-success p-3 text-xs">
          <div className="font-medium text-status-success-foreground">导入完成</div>
          <div className="text-status-success-foreground">
            成功导入 {result.imported} 条，跳过 {result.skipped} 条
            {result.errors > 0 && `，失败 ${result.errors} 条`}
          </div>
          {result.errorDetails.length > 0 && (
            <div className="mt-1 space-y-0.5 text-status-danger-foreground">
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
