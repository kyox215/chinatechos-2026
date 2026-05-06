"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaultSelector } from "@/components/orders/FaultSelector";
import { buildIssueFromFaults, parseFaultsFromIssue } from "@/lib/domain/fault-types";

type SupplierInfo = { id: string; name: string; shortName: string; color: string } | null;

type Props = {
  orderId: string;
  isEditable: boolean;
  customer: { id: string; name: string | null; phoneE164: string; phoneRaw: string | null } | null;
  device: { id: string; brand: string; model: string; serialOrImei: string | null } | null;
  supplier: SupplierInfo;
  issueDescription: string;
  diagnosisResult: string | null;
  technicianName: string | null;
  internalTag: string | null;
  warrantyText: string | null;
  pauseReason: string | null;
};

const BRANDS = ["Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus", "OPPO", "vivo", "Google", "其他"];

const SUPPLIER_COLORS: Record<string, { bg: string; text: string }> = {
  red: { bg: "bg-red-100", text: "text-red-700" },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
  green: { bg: "bg-green-100", text: "text-green-700" },
  teal: { bg: "bg-teal-100", text: "text-teal-700" },
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-700" },
  violet: { bg: "bg-violet-100", text: "text-violet-700" },
  pink: { bg: "bg-pink-100", text: "text-pink-700" },
  slate: { bg: "bg-slate-100", text: "text-slate-700" },
};

export function OrderInfoCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [customerName, setCustomerName] = useState(props.customer?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState(props.customer?.phoneE164 ?? "");
  const [brand, setBrand] = useState(props.device?.brand ?? "");
  const [model, setModel] = useState(props.device?.model ?? "");
  const [serialOrImei, setSerialOrImei] = useState(props.device?.serialOrImei ?? "");
  const [selectedFaults, setSelectedFaults] = useState<Map<string, string[]>>(
    () => parseFaultsFromIssue(props.issueDescription),
  );
  const [faultNote, setFaultNote] = useState("");
  const [diagnosis, setDiagnosis] = useState(props.diagnosisResult ?? "");
  const [technician, setTechnician] = useState(props.technicianName ?? "");
  const [tag, setTag] = useState(props.internalTag ?? "");
  const [warranty, setWarranty] = useState(props.warrantyText ?? "");
  const [pause, setPause] = useState(props.pauseReason ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setCustomerName(props.customer?.name ?? "");
    setCustomerPhone(props.customer?.phoneE164 ?? "");
    setBrand(props.device?.brand ?? "");
    setModel(props.device?.model ?? "");
    setSerialOrImei(props.device?.serialOrImei ?? "");
    setSelectedFaults(parseFaultsFromIssue(props.issueDescription));
    setDiagnosis(props.diagnosisResult ?? "");
    setTechnician(props.technicianName ?? "");
    setTag(props.internalTag ?? "");
    setWarranty(props.warrantyText ?? "");
    setPause(props.pauseReason ?? "");
  }, [editing, props]);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          serial_or_imei: serialOrImei.trim() || null,
          issue_description: buildIssueFromFaults(selectedFaults, faultNote),
          diagnosis_result: diagnosis.trim() || null,
          technician_name: technician.trim() || null,
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

  if (editing) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">编辑工单信息</h2>
          <button className="text-xs text-neutral-500 hover:text-neutral-700" onClick={() => setEditing(false)} type="button">取消</button>
        </div>

        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-neutral-500">客户</legend>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">电话</label>
                <input className="ui-input w-full text-xs" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">姓名</label>
                <input className="ui-input w-full text-xs" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-neutral-500">设备</legend>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">品牌</label>
                <select className="ui-input w-full text-xs" value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="">选择</option>
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">型号</label>
                <input className="ui-input w-full text-xs" value={model} onChange={(e) => setModel(e.target.value)} />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">IMEI/SN</label>
                <input className="ui-input w-full text-xs" value={serialOrImei} onChange={(e) => setSerialOrImei(e.target.value)} />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-neutral-500">故障 & 维修</legend>
            <FaultSelector selected={selectedFaults} onChange={setSelectedFaults} />
            <textarea
              className="ui-input min-h-[60px] w-full py-2 text-xs"
              placeholder="补充故障描述..."
              value={faultNote}
              onChange={(e) => setFaultNote(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">诊断结果</label>
                <input className="ui-input w-full text-xs" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">技师</label>
                <input className="ui-input w-full text-xs" value={technician} onChange={(e) => setTechnician(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">配件标签</label>
                <input className="ui-input w-full text-xs" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="如: SIM卡, 手机壳" />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">保修</label>
                <input className="ui-input w-full text-xs" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="如: 90天" />
              </div>
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] text-neutral-400">暂停原因</label>
              <input className="ui-input w-full text-xs" value={pause} onChange={(e) => setPause(e.target.value)} />
            </div>
          </fieldset>

          {error && <div className="text-xs text-rose-600">{error}</div>}

          <div className="flex gap-2 border-t border-border pt-3">
            <button
              className="ui-btn ui-btn-primary h-9 px-4 text-xs disabled:opacity-60"
              disabled={pending}
              onClick={handleSave}
              type="button"
            >
              {pending ? "保存中..." : "保存修改"}
            </button>
            <button
              className="ui-btn ui-btn-secondary h-9 px-3 text-xs"
              onClick={() => setEditing(false)}
              type="button"
            >
              取消
            </button>
          </div>
        </div>
      </section>
    );
  }

  const supplierColor = SUPPLIER_COLORS[props.supplier?.color ?? "blue"] ?? SUPPLIER_COLORS.blue;

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">工单信息</h2>
        {props.isEditable && (
          <button className="text-xs text-indigo-600 hover:underline" onClick={() => setEditing(true)} type="button">
            编辑
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 text-[11px] font-medium text-neutral-400">客户</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">姓名</span>
            {props.customer ? (
              <Link href={`/customers/${props.customer.id}`} className="text-indigo-600 hover:underline">
                {props.customer.name ?? "未命名客户"}
              </Link>
            ) : (
              <span className="text-neutral-900">-</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">电话</span>
            <span className="text-neutral-900">{props.customer?.phoneE164 ?? "-"}</span>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-1 text-[11px] font-medium text-neutral-400">设备</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">品牌</span><span className="text-neutral-900">{props.device?.brand ?? "-"}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">型号</span><span className="text-neutral-900">{props.device?.model ?? "-"}</span></div>
            <div className="col-span-2 flex justify-between"><span className="text-neutral-500">IMEI/SN</span><span className="text-neutral-900">{props.device?.serialOrImei ?? "-"}</span></div>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-1 text-[11px] font-medium text-neutral-400">故障 & 维修</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-neutral-500">问题描述</span>
              <span className="max-w-[60%] text-right text-neutral-900">{props.issueDescription || "-"}</span>
            </div>
            <div className="flex justify-between"><span className="text-neutral-500">诊断结果</span><span className="text-neutral-900">{props.diagnosisResult ?? "-"}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">技师</span><span className="text-neutral-900">{props.technicianName ?? "-"}</span></div>
            {props.supplier && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">配件来源</span>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${supplierColor.bg} ${supplierColor.text}`}>
                  {props.supplier.shortName}
                </span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-neutral-500">标签/配件</span><span className="text-neutral-900">{props.internalTag ?? "-"}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">保修</span><span className="text-neutral-900">{props.warrantyText ?? "-"}</span></div>
            {props.pauseReason && (
              <div className="flex justify-between"><span className="text-neutral-500">暂停原因</span><span className="font-medium text-rose-600">{props.pauseReason}</span></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
