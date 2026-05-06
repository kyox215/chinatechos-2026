"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  IconUser, IconDevice, IconSearch, IconMoney, IconPackage,
  IconSim, IconPhoneCase, IconBox, IconPlug, IconCable, IconHeadphones,
} from "@/components/icons";
import { BarcodeScanner } from "@/components/orders/BarcodeScanner";
import { FaultSelector } from "@/components/orders/FaultSelector";
import { FAULT_TYPES, buildIssueFromFaults } from "@/lib/domain/fault-types";

const BRANDS = ["Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus", "OPPO", "vivo", "Google", "其他"];

const ACCESSORY_OPTIONS: { key: string; label: string; icon: ReactNode }[] = [
  { key: "sim", label: "SIM卡", icon: <IconSim /> },
  { key: "case", label: "手机壳", icon: <IconPhoneCase /> },
  { key: "box", label: "包装盒", icon: <IconBox /> },
  { key: "charger", label: "充电头", icon: <IconPlug /> },
  { key: "cable", label: "数据线", icon: <IconCable /> },
  { key: "earphone", label: "耳机", icon: <IconHeadphones /> },
];

type Props = { open: boolean; onClose: () => void; initialPhone?: string; initialName?: string };

export function CreateOrderModal({ open, onClose, initialPhone, initialName }: Props) {
  const router = useRouter();

  const [customerName, setCustomerName] = useState(initialName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialPhone ?? "");
  const [customerSuggestions, setCustomerSuggestions] = useState<{ id: string; name: string | null; phoneE164: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [brand, setBrand] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialOrImei, setSerialOrImei] = useState("");
  const [selectedFaults, setSelectedFaults] = useState<Map<string, string[]>>(new Map());
  const [faultNote, setFaultNote] = useState("");
  const [faultPrices, setFaultPrices] = useState<Record<string, string>>({});
  const [deposit, setDeposit] = useState("");
  const [accessories, setAccessories] = useState<Set<string>>(new Set());
  const [customAccessory, setCustomAccessory] = useState("");
  const [technician, setTechnician] = useState("");
  const [warranty, setWarranty] = useState("6个月");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  useEffect(() => {
    const q = customerPhone.trim();
    if (q.length < 3) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/suggest?q=${encodeURIComponent(q)}&limit=5`);
        const data = (await res.json()) as { items?: { id: string; name: string | null; phoneE164: string }[] };
        setCustomerSuggestions(data.items ?? []);
        setShowSuggestions(true);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerPhone]);

  function toggleAccessory(key: string) {
    setAccessories((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }

  function buildInternalTag() {
    const labels = ACCESSORY_OPTIONS.filter((a) => accessories.has(a.key)).map((a) => a.label);
    if (customAccessory.trim()) labels.push(customAccessory.trim());
    return labels.join(", ");
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
          orderType: "dropoff_repair",
          customerPhone: customerPhone.trim(),
          customerName: customerName.trim() || undefined,
          brand: finalBrand,
          model: model.trim(),
          serialOrImei: serialOrImei.trim() || undefined,
          issueDescription: buildIssueFromFaults(selectedFaults, faultNote),
          quotationAmount: Object.values(faultPrices).reduce((s, v) => s + (Number(v) || 0), 0) || undefined,
          depositAmount: deposit ? Number(deposit) : undefined,
          technicianName: technician.trim() || undefined,
          internalTag: buildInternalTag() || undefined,
          warrantyText: warranty,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "创建失败");
      onClose();
      router.refresh();
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
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Col 1: Customer + Device */}
            <div className="space-y-4">
              <SectionTitle icon={<IconUser />} title="客户信息" />
              <Lbl label="电话" required>
                <div className="relative">
                  <input
                    className="ui-input w-full"
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="输入电话搜索客户"
                    value={customerPhone}
                  />
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-border bg-surface p-1 shadow-lg">
                      {customerSuggestions.map((c) => (
                        <button
                          key={c.id}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-muted"
                          onMouseDown={() => {
                            setCustomerPhone(c.phoneE164);
                            setCustomerName(c.name ?? "");
                            setShowSuggestions(false);
                          }}
                          type="button"
                        >
                          <span className="font-medium text-neutral-900">{c.name ?? "未命名"}</span>
                          <span className="text-neutral-500">{c.phoneE164}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Lbl>
              <Lbl label="姓名">
                <input className="ui-input w-full" onChange={(e) => setCustomerName(e.target.value)} placeholder="客户姓名 (可选)" value={customerName} />
              </Lbl>

              <SectionTitle icon={<IconDevice />} title="设备信息" />
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
                <div className="flex gap-2">
                  <input className="ui-input flex-1" onChange={(e) => setSerialOrImei(e.target.value)} placeholder="可选" value={serialOrImei} />
                  <button
                    className="ui-btn ui-btn-secondary h-10 w-10 flex shrink-0 items-center justify-center md:h-9 md:w-9"
                    onClick={() => setScannerOpen(true)}
                    title="扫码录入"
                    type="button"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.375v1.5H5.25v3H3.75v-3.375zM3.75 15.75v3.375c0 .621.504 1.125 1.125 1.125h3.375v-1.5H5.25v-3H3.75zm16.5-10.875v3.375h-1.5v-3h-3v-1.5h3.375c.621 0 1.125.504 1.125 1.125zm-1.5 10.875v3h-3v1.5h3.375c.621 0 1.125-.504 1.125-1.125V15.75h-1.5zM7.5 9v6h1.5V9H7.5zm3 0v6h3V9h-3zm4.5 0v6h1.5V9H15z" />
                    </svg>
                  </button>
                </div>
              </Lbl>
              <BarcodeScanner open={scannerOpen} onScan={(v) => setSerialOrImei(v)} onClose={() => setScannerOpen(false)} />
            </div>

            {/* Col 2: Fault + Finance + Service */}
            <div className="space-y-4">
              <SectionTitle icon={<IconSearch />} title="故障诊断" />
              <FaultSelector selected={selectedFaults} onChange={setSelectedFaults} />
              <Lbl label="故障备注 / 其他问题">
                <textarea className="ui-input min-h-[60px] w-full py-2" onChange={(e) => setFaultNote(e.target.value)} placeholder="详细描述故障情况..." value={faultNote} />
              </Lbl>
              <div className="border-t border-border pt-4" />
              <SectionTitle icon={<IconMoney />} title="报价 & 服务" />
              {selectedFaults.size > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-500">按项报价</div>
                  {Array.from(selectedFaults.entries()).map(([key, subs]) => {
                    const ft = FAULT_TYPES.find((f) => f.key === key);
                    const label = ft?.label ?? key;
                    const subLabels = subs.filter((s) => s !== "_self").map((sk) => ft?.subTypes?.find((st) => st.key === sk)?.label ?? sk);
                    const displayLabel = subLabels.length > 0 ? `${label}(${subLabels.join(", ")})` : label;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-neutral-700">{displayLabel}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-neutral-400">&euro;</span>
                          <input
                            className="ui-input h-8 w-20 text-xs"
                            onChange={(e) => setFaultPrices((p) => ({ ...p, [key]: e.target.value }))}
                            placeholder="0"
                            type="number"
                            value={faultPrices[key] ?? ""}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs font-semibold text-neutral-900">报价总额</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      &euro;{Object.values(faultPrices).reduce((s, v) => s + (Number(v) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Lbl label="定金 (€)">
                  <input className="ui-input w-full" onChange={(e) => setDeposit(e.target.value)} placeholder="0" type="number" value={deposit} />
                </Lbl>
                <Lbl label="待收余额">
                  <div className="flex h-10 items-center text-sm font-semibold text-neutral-900 md:h-9">
                    &euro;{Math.max(0, Object.values(faultPrices).reduce((s, v) => s + (Number(v) || 0), 0) - (Number(deposit) || 0)).toFixed(2)}
                  </div>
                </Lbl>
              </div>

              <SectionTitle icon={<IconPackage />} title="留下的配件" />
              <div className="grid grid-cols-2 gap-1.5">
                {ACCESSORY_OPTIONS.map((acc) => (
                  <button
                    key={acc.key}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      accessories.has(acc.key)
                        ? "border-primary bg-primary-2 text-primary"
                        : "border-border bg-surface-2 text-neutral-600 hover:bg-muted"
                    }`}
                    onClick={() => toggleAccessory(acc.key)}
                    type="button"
                  >
                    <span className="shrink-0">{acc.icon}</span>
                    <span>{acc.label}</span>
                  </button>
                ))}
              </div>
              <input className="ui-input w-full" onChange={(e) => setCustomAccessory(e.target.value)} placeholder="其他配件..." value={customAccessory} />

              <div className="grid grid-cols-2 gap-2">
                <Lbl label="技术员">
                  <input className="ui-input w-full" onChange={(e) => setTechnician(e.target.value)} placeholder="可选" value={technician} />
                </Lbl>
                <Lbl label="保修">
                  <select className="ui-input w-full" value={warranty} onChange={(e) => setWarranty(e.target.value)}>
                    <option value="3个月">3个月</option>
                    <option value="6个月">6个月</option>
                    <option value="12个月">12个月</option>
                  </select>
                </Lbl>
              </div>
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

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">{icon}<span>{title}</span></div>;
}

function Lbl({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</label>
      {children}
    </div>
  );
}
