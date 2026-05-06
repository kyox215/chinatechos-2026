"use client";

import type { ReactNode } from "react";
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
import { SupplierBadge } from "@/components/orders/SupplierBadge";
import { SupplierSelect } from "@/components/orders/SupplierSelect";

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

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[minmax(5.25rem,7rem)_1fr] sm:gap-x-3 sm:items-baseline">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <div className="min-w-0 text-neutral-900">{children}</div>
    </div>
  );
}


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
  const [supplierId, setSupplierId] = useState("");

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
      setSupplierId(props.supplier?.id ?? "");
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
          supplier_id: supplierId.trim() || null,
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
            <div className="space-y-1 pt-1">
              <label className="text-xs font-medium text-neutral-600" htmlFor="order-supplier-edit">
                配件来源
              </label>
              <SupplierSelect
                disabled={pending}
                id="order-supplier-edit"
                onChange={setSupplierId}
                value={supplierId}
              />
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
            <button className="ui-btn ui-btn-secondary h-9 px-3 text-xs" onClick={() => setEditing(false)} type="button">
              取消
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">工单信息</h2>
        {props.isEditable && (
          <button
            className="ui-btn ui-btn-secondary h-8 min-h-[32px] px-3 text-xs font-medium"
            onClick={() => setEditing(true)}
            type="button"
          >
            编辑
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 text-[11px] font-medium text-neutral-400">客户</div>
          <div className="space-y-1.5">
            <InfoRow label="姓名">
              {props.customer ? (
                <Link href={`/customers/${props.customer.id}`} className="text-indigo-600 hover:underline">
                  {props.customer.name ?? "未命名客户"}
                </Link>
              ) : (
                "-"
              )}
            </InfoRow>
            <InfoRow label="电话">{props.customer?.phoneE164 ?? "-"}</InfoRow>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-1 text-[11px] font-medium text-neutral-400">设备</div>
          <div className="space-y-1.5">
            <InfoRow label="品牌">{props.device?.brand ?? "-"}</InfoRow>
            <InfoRow label="型号">{props.device?.model ?? "-"}</InfoRow>
            <InfoRow label="IMEI/SN">{props.device?.serialOrImei ?? "-"}</InfoRow>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-1 text-[11px] font-medium text-neutral-400">故障 & 维修</div>
          <div className="space-y-2 text-sm">
            <div className="space-y-1">
              <div className="text-neutral-500">问题描述</div>
              <p className="whitespace-pre-wrap break-words leading-relaxed text-neutral-900">{props.issueDescription || "-"}</p>
            </div>
            <InfoRow label="技师">{props.technicianName ?? "-"}</InfoRow>
            <InfoRow label="配件来源">
              {props.supplier ? (
                <SupplierBadge color={props.supplier.color} name={props.supplier.shortName} size="sm" />
              ) : (
                "-"
              )}
            </InfoRow>
            <InfoRow label="标签/配件">{props.internalTag ?? "-"}</InfoRow>
            <InfoRow label="保修">{props.warrantyText ?? "-"}</InfoRow>
            {props.pauseReason && (
              <InfoRow label="暂停原因">
                <span className="font-medium text-rose-600">{props.pauseReason}</span>
              </InfoRow>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
