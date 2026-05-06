"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  orderId: string;
  issueDescription: string;
  diagnosisResult: string | null;
  technicianName: string | null;
  quotationAmount: number | null;
  internalTag: string | null;
  warrantyText: string | null;
  pauseReason: string | null;
  isEditable: boolean;
};

export function EditableRepairCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [issue, setIssue] = useState(props.issueDescription);
  const [diagnosis, setDiagnosis] = useState(props.diagnosisResult ?? "");
  const [technician, setTechnician] = useState(props.technicianName ?? "");
  const [quotation, setQuotation] = useState(props.quotationAmount != null ? String(props.quotationAmount) : "");
  const [tag, setTag] = useState(props.internalTag ?? "");
  const [warranty, setWarranty] = useState(props.warrantyText ?? "");
  const [pause, setPause] = useState(props.pauseReason ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_description: issue.trim(),
          diagnosis_result: diagnosis.trim() || null,
          technician_name: technician.trim() || null,
          quotation_amount: quotation ? Number(quotation) : null,
          internal_tag: tag.trim() || null,
          warranty_text: warranty.trim() || null,
          pause_reason: pause.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">维修信息</h2>
        {props.isEditable && !editing && (
          <button
            className="text-xs text-indigo-600 hover:underline"
            onClick={() => setEditing(true)}
            type="button"
          >
            编辑
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2.5">
          <Field label="问题描述">
            <textarea
              className="ui-input w-full min-h-[60px] py-2"
              onChange={(e) => setIssue(e.target.value)}
              value={issue}
            />
          </Field>
          <Field label="诊断结果">
            <textarea
              className="ui-input w-full min-h-[60px] py-2"
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="诊断结论..."
              value={diagnosis}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Field label="技师">
              <input
                className="ui-input w-full"
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="技师姓名"
                value={technician}
              />
            </Field>
            <Field label="报价金额 (EUR)">
              <input
                className="ui-input w-full"
                onChange={(e) => setQuotation(e.target.value)}
                placeholder="0.00"
                type="number"
                value={quotation}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Field label="内部标签">
              <input
                className="ui-input w-full"
                onChange={(e) => setTag(e.target.value)}
                placeholder="如: 屏幕、主板..."
                value={tag}
              />
            </Field>
            <Field label="保修说明">
              <input
                className="ui-input w-full"
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="如: 90天保修"
                value={warranty}
              />
            </Field>
          </div>
          <Field label="暂停原因">
            <input
              className="ui-input w-full"
              onChange={(e) => setPause(e.target.value)}
              placeholder="如: 等配件到货..."
              value={pause}
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              className="ui-btn ui-btn-primary h-8 px-3 text-xs disabled:opacity-60"
              disabled={pending}
              onClick={handleSave}
              type="button"
            >
              {pending ? "保存中..." : "保存"}
            </button>
            <button
              className="ui-btn ui-btn-secondary h-8 px-3 text-xs"
              onClick={() => {
                setEditing(false);
                setIssue(props.issueDescription);
                setDiagnosis(props.diagnosisResult ?? "");
                setTechnician(props.technicianName ?? "");
                setQuotation(props.quotationAmount != null ? String(props.quotationAmount) : "");
                setTag(props.internalTag ?? "");
                setWarranty(props.warrantyText ?? "");
                setPause(props.pauseReason ?? "");
                setError(null);
              }}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          <Row label="问题描述" value={props.issueDescription} />
          <Row label="诊断结果" value={props.diagnosisResult ?? "-"} />
          <Row label="技师" value={props.technicianName ?? "-"} />
          <Row label="报价" value={props.quotationAmount != null ? `€${props.quotationAmount}` : "-"} />
          <Row label="标签" value={props.internalTag ?? "-"} />
          <Row label="保修" value={props.warrantyText ?? "-"} />
          {props.pauseReason && <Row label="暂停原因" value={props.pauseReason} highlight />}
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={highlight ? "font-medium text-amber-700" : "text-neutral-900 text-right max-w-[60%]"}>
        {value}
      </span>
    </div>
  );
}
