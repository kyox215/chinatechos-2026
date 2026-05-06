"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const BRANDS = ["Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus", "OPPO", "vivo", "Google", "其他"];

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

const ACCESSORY_OPTIONS = ["SIM卡", "手机壳", "包装盒", "充电头", "数据线", "耳机"];

type Props = { open: boolean; onClose: () => void };

export function CreateOrderModal({ open, onClose }: Props) {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialOrImei, setSerialOrImei] = useState("");
  const [selectedFaults, setSelectedFaults] = useState<Set<string>>(new Set());
  const [faultNote, setFaultNote] = useState("");
  const [quotation, setQuotation] = useState("");
  const [deposit, setDeposit] = useState("");
  const [isDropoff, setIsDropoff] = useState(true);
  const [accessories, setAccessories] = useState<Set<string>>(new Set());
  const [customAccessory, setCustomAccessory] = useState("");
  const [technician, setTechnician] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  function toggleFault(key: string) {
    setSelectedFaults((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }
  function toggleAccessory(label: string) {
    setAccessories((prev) => { const n = new Set(prev); if (n.has(label)) n.delete(label); else n.add(label); return n; });
  }

  function buildIssueDescription() {
    const parts = FAULT_TYPES.filter((f) => selectedFaults.has(f.key)).map((f) => f.label);
    if (faultNote.trim()) parts.push(faultNote.trim());
    return parts.join("; ") || "未填写问题描述";
  }

  function buildInternalTag() {
    const tags = [...accessories];
    if (customAccessory.trim()) tags.push(customAccessory.trim());
    return tags.join(", ");
  }

  async function handleSubmit() {
    const finalBrand = brand === "其他" ? customBrand.trim() : brand;
    if (!customerPhone.trim()) { setError("客户电话不能为空"); return; }
    if (!finalBrand) { setError("设备品牌不能为空"); return; }
    if (!model.trim()) { setError("设备型号不能为空"); return; }
    if (selectedFaults.size === 0 && !faultNote.trim()) { setError("请至少选择一个故障类型或填写故障描述"); return; }

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: isDropoff ? "dropoff_repair" : "quick_repair",
          customerPhone: customerPhone.trim(),
          customerName: customerName.trim() || undefined,
          brand: finalBrand,
          model: model.trim(),
          serialOrImei: serialOrImei.trim() || undefined,
          issueDescription: buildIssueDescription(),
          quotationAmount: quotation ? Number(quotation) : undefined,
          depositAmount: deposit ? Number(deposit) : undefined,
          technicianName: technician.trim() || undefined,
          internalTag: buildInternalTag() || undefined,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "创建失败");
      onClose();
      if (data.id) router.push(`/orders/${data.id}`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-lg md:max-w-3xl md:rounded-2xl md:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">新建维修订单</h2>
            <p className="text-xs text-neutral-500">填写客户和设备信息以创建新工单</p>
          </div>
          <button className="ui-btn ui-btn-secondary h-9 w-9 flex items-center justify-center" onClick={onClose} type="button">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Col 1: Customer + Device */}
            <div className="space-y-4">
              <SectionTitle icon="👤" title="客户信息" />
              <Lbl label="姓名" required>
                <input className="ui-input w-full" onChange={(e) => setCustomerName(e.target.value)} placeholder="客户姓名" value={customerName} />
              </Lbl>
              <Lbl label="电话" required>
                <input className="ui-input w-full" onChange={(e) => setCustomerPhone(e.target.value)} placeholder="联系电话" value={customerPhone} />
              </Lbl>

              <SectionTitle icon="📱" title="设备信息" />
              <Lbl label="品牌" required>
                <select className="ui-input w-full" onChange={(e) => setBrand(e.target.value)} value={brand}>
                  <option value="">选择品牌</option>
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                {brand === "其他" && <input className="ui-input mt-2 w-full" onChange={(e) => setCustomBrand(e.target.value)} placeholder="输入品牌名" value={customBrand} />}
              </Lbl>
              <Lbl label="型号" required>
                <input className="ui-input w-full" onChange={(e) => setModel(e.target.value)} placeholder="例如: iPhone 13" value={model} />
              </Lbl>
              <Lbl label="IMEI / 序列号">
                <input className="ui-input w-full" onChange={(e) => setSerialOrImei(e.target.value)} placeholder="可选" value={serialOrImei} />
              </Lbl>
            </div>

            {/* Col 2: Fault diagnosis */}
            <div className="space-y-4">
              <SectionTitle icon="🔍" title="故障诊断" />
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
                    <span className="text-base">{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
              <Lbl label="故障备注 / 其他问题">
                <textarea className="ui-input min-h-[80px] w-full py-2" onChange={(e) => setFaultNote(e.target.value)} placeholder="详细描述故障情况..." value={faultNote} />
              </Lbl>
            </div>

            {/* Col 3: Finance & Service */}
            <div className="space-y-4">
              <SectionTitle icon="💰" title="财务 & 服务" />
              <div className="grid grid-cols-2 gap-2">
                <Lbl label="总价 (€)">
                  <input className="ui-input w-full" onChange={(e) => setQuotation(e.target.value)} placeholder="0" type="number" value={quotation} />
                </Lbl>
                <Lbl label="定金 (€)">
                  <input className="ui-input w-full" onChange={(e) => setDeposit(e.target.value)} placeholder="0" type="number" value={deposit} />
                </Lbl>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                <span className="text-sm text-neutral-700">客户留机维修</span>
                <button
                  className={`relative h-6 w-11 rounded-full transition-colors ${isDropoff ? "bg-primary" : "bg-neutral-300"}`}
                  onClick={() => setIsDropoff((v) => !v)}
                  type="button"
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform ${isDropoff ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>

              <SectionTitle icon="📦" title="留下的配件" />
              <div className="flex flex-wrap gap-2">
                {ACCESSORY_OPTIONS.map((acc) => (
                  <button
                    key={acc}
                    className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                      accessories.has(acc)
                        ? "border-primary bg-primary-2 text-primary"
                        : "border-border bg-surface-2 text-neutral-600 hover:bg-muted"
                    }`}
                    onClick={() => toggleAccessory(acc)}
                    type="button"
                  >
                    {acc}
                  </button>
                ))}
              </div>
              <input className="ui-input w-full" onChange={(e) => setCustomAccessory(e.target.value)} placeholder="其他配件..." value={customAccessory} />

              <Lbl label="技术员">
                <input className="ui-input w-full" onChange={(e) => setTechnician(e.target.value)} placeholder="可选" value={technician} />
              </Lbl>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="min-w-0 flex-1">{error && <span className="text-xs text-rose-600">{error}</span>}</div>
          <div className="flex gap-2">
            <button className="ui-btn ui-btn-secondary h-10 px-4 md:h-9" onClick={onClose} type="button">取消</button>
            <button className="ui-btn ui-btn-primary h-10 px-4 md:h-9 disabled:opacity-60" disabled={pending} onClick={handleSubmit} type="button">
              {pending ? "创建中..." : "创建订单"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900"><span>{icon}</span><span>{title}</span></div>;
}

function Lbl({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</label>
      {children}
    </div>
  );
}
