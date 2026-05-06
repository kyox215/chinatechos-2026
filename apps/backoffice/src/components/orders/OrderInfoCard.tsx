"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  OrderFormCustomerDevice,
  OrderFormFaultSection,
  OrderFormServiceMeta,
  ORDER_FORM_BRANDS,
} from "@/components/orders/OrderFormFields";
import { buildIssueFromFaults, extractFaultExtraNote, parseFaultsFromIssue } from "@/lib/domain/fault-types";

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

function normalizeBrand(stored: string): { brand: string; customBrand: string } {
  const b = stored.trim();
  if (!b) return { brand: "", customBrand: "" };
  const preset = ORDER_FORM_BRANDS.filter((x) => x !== "其他");
  if (preset.includes(b)) return { brand: b, customBrand: "" };
  return { brand: "其他", customBrand: b };
}

export function OrderInfoCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [customerName, setCustomerName] = useState(props.customer?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState(props.customer?.phoneE164 ?? "");
  const [brand, setBrand] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [model, setModel] = useState(props.device?.model ?? "");
  const [serialOrImei, setSerialOrImei] = useState(props.device?.serialOrImei ?? "");
  const [selectedFaults, setSelectedFaults] = useState<Map<string, string[]>>(
    () => parseFaultsFromIssue(props.issueDescription),
  );
  const [faultNote, setFaultNote] = useState("");
  const [technician, setTechnician] = useState(props.technicianName ?? "");
  const [tag, setTag] = useState(props.internalTag ?? "");
  const [warranty, setWarranty] = useState(props.warrantyText ?? "");
  const [pause, setPause] = useState(props.pauseReason ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<{ id: string; name: string | null; phoneE164: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const timer = window.setTimeout(() => {
      const nb = normalizeBrand(props.device?.brand ?? "");
      setCustomerName(props.customer?.name ?? "");
      setCustomerPhone(props.customer?.phoneE164 ?? "");
      setBrand(nb.brand);
      setCustomBrand(nb.customBrand);
      setModel(props.device?.model ?? "");
      setSerialOrImei(props.device?.serialOrImei ?? "");
      setSelectedFaults(parseFaultsFromIssue(props.issueDescription));
      setFaultNote(extractFaultExtraNote(props.issueDescription));
      setTechnician(props.technicianName ?? "");
      setTag(props.internalTag ?? "");
      setWarranty(props.warrantyText ?? "");
      setPause(props.pauseReason ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editing, props]);

  useEffect(() => {
    if (!editing) return;
    const q = customerPhone.trim();
    if (q.length < 3) {
      const clearTimer = window.setTimeout(() => setCustomerSuggestions([]), 0);
      return () => window.clearTimeout(clearTimer);
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/suggest?q=${encodeURIComponent(q)}&limit=5`);
        const data = (await res.json()) as { items?: { id: string; name: string | null; phoneE164: string }[] };
        setCustomerSuggestions(data.items ?? []);
        setShowSuggestions(true);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerPhone, editing]);

  async function handleSave() {
    const finalBrand = brand === "其他" ? customBrand.trim() : brand;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          brand: finalBrand.trim() || null,
          model: model.trim() || null,
          serial_or_imei: serialOrImei.trim() || null,
          issue_description: buildIssueFromFaults(selectedFaults, faultNote),
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
          <button className="text-xs text-neutral-500 hover:text-neutral-700" onClick={() => setEditing(false)} type="button">
            取消
          </button>
        </div>

        <div className="space-y-4">
          <OrderFormCustomerDevice
            brand={brand}
            customBrand={customBrand}
            customerName={customerName}
            customerPhone={customerPhone}
            customerSuggestions={customerSuggestions}
            inputClass="text-xs"
            model={model}
            phonePlaceholder="输入电话搜索"
            scannerOpen={scannerOpen}
            serialOrImei={serialOrImei}
            setBrand={setBrand}
            setCustomBrand={setCustomBrand}
            setCustomerName={setCustomerName}
            setCustomerPhone={setCustomerPhone}
            setModel={setModel}
            setScannerOpen={setScannerOpen}
            setSerialOrImei={setSerialOrImei}
            setShowSuggestions={setShowSuggestions}
            showSuggestions={showSuggestions}
          />

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-neutral-500">故障 & 维修</legend>
            <OrderFormFaultSection
              faultNote={faultNote}
              faultNotePlaceholder="补充故障描述..."
              hideHeading
              selectedFaults={selectedFaults}
              setFaultNote={setFaultNote}
              setSelectedFaults={setSelectedFaults}
              inputClass="text-xs"
            />
            <OrderFormServiceMeta
              internalTag={tag}
              pauseReason={pause}
              setInternalTag={setTag}
              setPauseReason={setPause}
              setTechnician={setTechnician}
              setWarranty={setWarranty}
              showPauseReason
              technician={technician}
              warranty={warranty}
              inputClass="text-xs"
            />
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
            <button className="ui-btn ui-btn-secondary h-9 px-3 text-xs" onClick={() => setEditing(false)} type="button">
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
