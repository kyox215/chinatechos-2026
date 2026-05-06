"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FAULT_TYPES = [
  { key: "screen", label: "屏幕", icon: "📱" },
  { key: "battery", label: "电池", icon: "🔋" },
  { key: "charging", label: "尾插", icon: "⚡" },
  { key: "camera", label: "摄像头", icon: "📷" },
  { key: "water", label: "进水", icon: "💧" },
  { key: "motherboard", label: "主板", icon: "🔧" },
  { key: "system", label: "系统", icon: "⚙️" },
  { key: "backcover", label: "后盖", icon: "🔲" },
  { key: "faceid", label: "面容/指纹", icon: "👤" },
  { key: "speaker", label: "听筒/扬声器", icon: "🔊" },
  { key: "mic", label: "麦克风", icon: "🎙️" },
  { key: "buttons", label: "按键", icon: "⏸️" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  issueDescription: string;
  diagnosisResult: string | null;
  technicianName: string | null;
  quotationAmount: number | null;
  depositAmount: number | null;
  internalTag: string | null;
  warrantyText: string | null;
  pauseReason: string | null;
};

export function OrderEditModal(props: Props) {
  const router = useRouter();

  const [issue, setIssue] = useState(props.issueDescription);
  const [diagnosis, setDiagnosis] = useState(props.diagnosisResult ?? "");
  const [technician, setTechnician] = useState(props.technicianName ?? "");
  const [quotation, setQuotation] = useState(props.quotationAmount != null ? String(props.quotationAmount) : "");
  const [deposit, setDeposit] = useState(props.depositAmount != null ? String(props.depositAmount) : "");
  const [tag, setTag] = useState(props.internalTag ?? "");
  const [warranty, setWarranty] = useState(props.warrantyText ?? "");
  const [pause, setPause] = useState(props.pauseReason ?? "");
  const [selectedFaults, setSelectedFaults] = useState<Set<string>>(() => {
    const faults = new Set<string>();
    for (const ft of FAULT_TYPES) {
      if (props.issueDescription.includes(ft.label)) faults.add(ft.key);
    }
    return faults;
  });

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFault(key: string) {
    setSelectedFaults((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function buildIssue(): string {
    const labels = FAULT_TYPES.filter((f) => selectedFaults.has(f.key)).map((f) => f.label);
    const extra = issue.trim();
    const knownLabels = new Set(FAULT_TYPES.map((f) => f.label));
    const extraClean = extra
      .split(/[;；]/)
      .map((s) => s.trim())
      .filter((s) => s && !knownLabels.has(s))
      .join("; ");
    const parts = [...labels];
    if (extraClean) parts.push(extraClean);
    return parts.join("; ") || extra || "未填写";
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_description: buildIssue(),
          diagnosis_result: diagnosis.trim() || null,
          technician_name: technician.trim() || null,
          quotation_amount: quotation ? Number(quotation) : null,
          deposit_amount: deposit ? Number(deposit) : null,
          internal_tag: tag.trim() || null,
          warranty_text: warranty.trim() || null,
          pause_reason: pause.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      props.onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">编辑维修信息</h2>
          <p className="text-xs text-neutral-500">修改工单的故障诊断、维修和财务信息。</p>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-muted hover:text-neutral-600" onClick={props.onClose} type="button">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Fault diagnosis */}
          <div className="space-y-5">
            <SectionTitle icon="🔍" title="故障诊断" />
            <div className="grid grid-cols-3 gap-2">
              {FAULT_TYPES.map((fault) => (
                <button
                  key={fault.key}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs transition-colors ${
                    selectedFaults.has(fault.key)
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                      : "border-border bg-surface hover:bg-muted"
                  }`}
                  onClick={() => toggleFault(fault.key)}
                  type="button"
                >
                  <span className="text-lg">{fault.icon}</span>
                  <span>{fault.label}</span>
                </button>
              ))}
            </div>
            <Lbl label="问题描述 / 补充">
              <textarea className="ui-input min-h-[80px] w-full py-2" onChange={(e) => setIssue(e.target.value)} value={issue} />
            </Lbl>
            <Lbl label="诊断结果">
              <textarea className="ui-input min-h-[80px] w-full py-2" onChange={(e) => setDiagnosis(e.target.value)} placeholder="诊断结论..." value={diagnosis} />
            </Lbl>
          </div>

          {/* Middle: Repair details */}
          <div className="space-y-5">
            <SectionTitle icon="🔧" title="维修详情" />
            <Lbl label="技术员">
              <input className="ui-input w-full" onChange={(e) => setTechnician(e.target.value)} placeholder="技师姓名" value={technician} />
            </Lbl>
            <Lbl label="内部标签 / 配件">
              <input className="ui-input w-full" onChange={(e) => setTag(e.target.value)} placeholder="如: SIM卡, 手机壳, 屏幕" value={tag} />
            </Lbl>
            <Lbl label="保修说明">
              <input className="ui-input w-full" onChange={(e) => setWarranty(e.target.value)} placeholder="如: 90天保修" value={warranty} />
            </Lbl>
            <Lbl label="暂停原因">
              <input className="ui-input w-full" onChange={(e) => setPause(e.target.value)} placeholder="如: 等配件到货..." value={pause} />
            </Lbl>
          </div>

          {/* Right: Finance */}
          <div className="space-y-5">
            <SectionTitle icon="💰" title="财务信息" />
            <div className="grid grid-cols-2 gap-3">
              <Lbl label="报价 (€)">
                <input className="ui-input w-full" onChange={(e) => setQuotation(e.target.value)} placeholder="0" type="number" value={quotation} />
              </Lbl>
              <Lbl label="定金 (€)">
                <input className="ui-input w-full" onChange={(e) => setDeposit(e.target.value)} placeholder="0" type="number" value={deposit} />
              </Lbl>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <div>{error && <span className="text-sm text-rose-600">{error}</span>}</div>
        <div className="flex gap-3">
          <button className="h-10 rounded-xl border border-border bg-surface px-5 text-sm font-medium text-neutral-700 hover:bg-muted" onClick={props.onClose} type="button">取消</button>
          <button className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={handleSave} type="button">
            {pending ? "保存中..." : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
      <span>{icon}</span><span>{title}</span>
    </div>
  );
}

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      {children}
    </div>
  );
}
