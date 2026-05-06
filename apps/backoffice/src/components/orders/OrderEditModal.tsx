"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  IconScreen, IconBattery, IconCharging, IconCamera, IconWater,
  IconMotherboard, IconSystem, IconBackcover, IconFaceId, IconSpeaker,
  IconMic, IconButtons, IconSearch, IconWrench, IconMoney,
} from "@/components/icons";

const FAULT_TYPES: { key: string; label: string; icon: ReactNode }[] = [
  { key: "screen", label: "屏幕", icon: <IconScreen /> },
  { key: "battery", label: "电池", icon: <IconBattery /> },
  { key: "charging", label: "尾插", icon: <IconCharging /> },
  { key: "camera", label: "摄像头", icon: <IconCamera /> },
  { key: "water", label: "进水", icon: <IconWater /> },
  { key: "motherboard", label: "主板", icon: <IconMotherboard /> },
  { key: "system", label: "系统", icon: <IconSystem /> },
  { key: "backcover", label: "后盖", icon: <IconBackcover /> },
  { key: "faceid", label: "面容/指纹", icon: <IconFaceId /> },
  { key: "speaker", label: "听筒/扬声器", icon: <IconSpeaker /> },
  { key: "mic", label: "麦克风", icon: <IconMic /> },
  { key: "buttons", label: "按键", icon: <IconButtons /> },
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

  useEffect(() => {
    if (!props.open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [props.open]);

  function toggleFault(key: string) {
    setSelectedFaults((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }

  function buildIssue(): string {
    const labels = FAULT_TYPES.filter((f) => selectedFaults.has(f.key)).map((f) => f.label);
    const knownLabels = new Set(FAULT_TYPES.map((f) => f.label));
    const extraClean = issue.split(/[;；]/).map((s) => s.trim()).filter((s) => s && !knownLabels.has(s)).join("; ");
    const parts = [...labels];
    if (extraClean) parts.push(extraClean);
    return parts.join("; ") || issue || "未填写";
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
    >
      <div className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-lg md:max-w-3xl md:rounded-2xl md:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">编辑维修信息</h2>
            <p className="text-xs text-neutral-500">修改故障诊断、维修和财务信息</p>
          </div>
          <button className="ui-btn ui-btn-secondary h-9 w-9 flex items-center justify-center" onClick={props.onClose} type="button">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Col 1: Fault */}
            <div className="space-y-4">
              <SectionTitle icon={<IconSearch />} title="故障诊断" />
              <div className="grid grid-cols-3 gap-2">
                {FAULT_TYPES.map((f) => (
                  <button
                    key={f.key}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs transition-colors ${
                      selectedFaults.has(f.key)
                        ? "border-primary bg-primary-2 text-primary ring-1 ring-ring"
                        : "border-border bg-surface-2 hover:bg-muted"
                    }`}
                    onClick={() => toggleFault(f.key)}
                    type="button"
                  >
                    {f.icon}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
              <Lbl label="问题描述 / 补充">
                <textarea className="ui-input min-h-[70px] w-full py-2" onChange={(e) => setIssue(e.target.value)} value={issue} />
              </Lbl>
              <Lbl label="诊断结果">
                <textarea className="ui-input min-h-[70px] w-full py-2" onChange={(e) => setDiagnosis(e.target.value)} placeholder="诊断结论..." value={diagnosis} />
              </Lbl>
            </div>

            {/* Col 2: Repair */}
            <div className="space-y-4">
              <SectionTitle icon={<IconWrench />} title="维修详情" />
              <Lbl label="技术员"><input className="ui-input w-full" onChange={(e) => setTechnician(e.target.value)} placeholder="技师姓名" value={technician} /></Lbl>
              <Lbl label="内部标签 / 配件"><input className="ui-input w-full" onChange={(e) => setTag(e.target.value)} placeholder="如: SIM卡, 手机壳" value={tag} /></Lbl>
              <Lbl label="保修说明"><input className="ui-input w-full" onChange={(e) => setWarranty(e.target.value)} placeholder="如: 90天保修" value={warranty} /></Lbl>
              <Lbl label="暂停原因"><input className="ui-input w-full" onChange={(e) => setPause(e.target.value)} placeholder="如: 等配件到货..." value={pause} /></Lbl>
            </div>

            {/* Col 3: Finance */}
            <div className="space-y-4">
              <SectionTitle icon={<IconMoney />} title="财务信息" />
              <div className="grid grid-cols-2 gap-2">
                <Lbl label="报价 (€)"><input className="ui-input w-full" onChange={(e) => setQuotation(e.target.value)} placeholder="0" type="number" value={quotation} /></Lbl>
                <Lbl label="定金 (€)"><input className="ui-input w-full" onChange={(e) => setDeposit(e.target.value)} placeholder="0" type="number" value={deposit} /></Lbl>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="min-w-0 flex-1">{error && <span className="text-xs text-rose-600">{error}</span>}</div>
          <div className="flex gap-2">
            <button className="ui-btn ui-btn-secondary h-10 px-4 md:h-9" onClick={props.onClose} type="button">取消</button>
            <button className="ui-btn ui-btn-primary h-10 px-4 md:h-9 disabled:opacity-60" disabled={pending} onClick={handleSave} type="button">
              {pending ? "保存中..." : "保存修改"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">{icon}<span>{title}</span></div>;
}

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs text-neutral-500">{label}</label>{children}</div>;
}
