"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { IconMoney, IconSearch } from "@/components/icons";
import {
  OrderFormCustomerDevice,
  OrderFormFaultSection,
  OrderFormServiceMeta,
} from "@/components/orders/OrderFormFields";
import { OrderPrintSheet } from "@/components/orders/OrderPrintSheet";
import { FaultPriceLineInputs, FinancialSummaryThree } from "@/components/orders/QuoteFinanceBlocks";
import { buildFaultPriceLinesItalian, buildIssueItalianFromFaults } from "@/lib/domain/fault-print-it";
import { FAULT_TYPES, buildIssueFromFaults } from "@/lib/domain/fault-types";
import type { PrintOptions } from "@/lib/domain/print-mode";
import { triggerOrderSheetPrint } from "@/lib/domain/print-mode";
import type { OrderPrintPayload } from "@/lib/domain/order-print-it";

type Props = { open: boolean; onClose: () => void; initialPhone?: string; initialName?: string };

function faultLinesFromMap(selected: Map<string, string[]>) {
  return Array.from(selected.entries()).map(([key, subs]) => {
    const ft = FAULT_TYPES.find((f) => f.key === key);
    const label = ft?.label ?? key;
    const subLabels = subs
      .filter((s) => s !== "_self")
      .map((sk) => ft?.subTypes?.find((st) => st.key === sk)?.label ?? sk);
    const displayLabel = subLabels.length > 0 ? `${label}(${subLabels.join(", ")})` : label;
    return { key, label: displayLabel };
  });
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
      {icon}
      <span>{title}</span>
    </div>
  );
}

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
  const [technician, setTechnician] = useState("");
  const [warranty, setWarranty] = useState("6个月");
  const [internalTag, setInternalTag] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printedPublicNo, setPrintedPublicNo] = useState<string | null>(null);
  const [defaultPrintOptions, setDefaultPrintOptions] = useState<PrintOptions | undefined>(undefined);

  const faultLines = useMemo(() => faultLinesFromMap(selectedFaults), [selectedFaults]);
  const orderTotal = Object.values(faultPrices).reduce((s, v) => s + (Number(v) || 0), 0);
  const receivable = Math.max(0, orderTotal - (Number(deposit) || 0));

  const finalBrand = brand === "其他" ? customBrand.trim() : brand;

  const printPayload: OrderPrintPayload = useMemo(() => {
    const variant = printedPublicNo ? "saved" : "draft";
    const lines = buildFaultPriceLinesItalian(selectedFaults, faultPrices);
    return {
      variant,
      publicNo: printedPublicNo,
      printedAtIso: new Date().toISOString(),
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim(),
      brand: finalBrand || "—",
      model: model.trim() || "—",
      serialOrImei: serialOrImei.trim() || null,
      issueSummaryIt: buildIssueItalianFromFaults(selectedFaults, faultNote),
      interventionFreeNote: faultNote.trim() || null,
      diagnosisResult: null,
      quotationAmount: orderTotal > 0 ? orderTotal : null,
      depositAmount: deposit ? Number(deposit) : null,
      balanceAmount: receivable > 0 ? receivable : null,
      technicianName: technician.trim() || null,
      warrantyTextCn: warranty,
      internalTag: internalTag.trim() || null,
      faultPriceLines: lines.length > 0 ? lines : undefined,
    };
  }, [
    printedPublicNo,
    customerName,
    customerPhone,
    finalBrand,
    model,
    serialOrImei,
    selectedFaults,
    faultPrices,
    faultNote,
    orderTotal,
    deposit,
    receivable,
    technician,
    warranty,
    internalTag,
  ]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
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
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerPhone]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/stores/settings")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        setDefaultPrintOptions({
          paperSize: data.printPaper,
          orientation: data.printOrientation,
          density: data.printDensity,
          marginMm: data.printMarginMm,
        });
      })
      .catch(() => {
        if (!cancelled) setDefaultPrintOptions(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!printedPublicNo) return;
    const id = requestAnimationFrame(() => {
      triggerOrderSheetPrint(defaultPrintOptions, () => {
        setPrintedPublicNo(null);
        onClose();
        router.refresh();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [printedPublicNo, defaultPrintOptions, onClose, router]);

  function validateForSubmit(): boolean {
    if (!customerPhone.trim()) {
      setError("客户电话不能为空");
      return false;
    }
    if (!finalBrand) {
      setError("设备品牌不能为空");
      return false;
    }
    if (!model.trim()) {
      setError("设备型号不能为空");
      return false;
    }
    if (selectedFaults.size === 0 && !faultNote.trim()) {
      setError("请至少选择一个故障类型或填写故障描述");
      return false;
    }
    return true;
  }

  function handleDraftPrint() {
    setError(null);
    if (!validateForSubmit()) return;
    requestAnimationFrame(() => {
      triggerOrderSheetPrint(defaultPrintOptions);
    });
  }

  async function handleSubmit() {
    if (pending) return;
    if (!validateForSubmit()) return;

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
          quotationAmount: orderTotal || undefined,
          depositAmount: deposit ? Number(deposit) : undefined,
          technicianName: technician.trim() || undefined,
          internalTag: internalTag.trim() || undefined,
          warrantyText: warranty,
        }),
      });
      const data = (await res.json()) as { id?: string; public_no?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "创建失败");
      const pub = data.public_no?.trim();
      if (pub) setPrintedPublicNo(pub);
      else {
        onClose();
        router.refresh();
      }
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <OrderPrintSheet payload={printPayload} />

      <div className="flex h-[100dvh] w-full flex-col rounded-t-2xl border-x-0 border-b-0 border-border bg-surface shadow-lg sm:max-h-[92dvh] sm:rounded-2xl sm:border md:h-[min(720px,calc(100vh-5rem))] md:min-h-[640px] md:max-h-[85vh] xl:max-w-6xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">新建维修订单</h2>
            <p className="text-xs text-neutral-500">填写客户和设备信息以创建新工单</p>
          </div>
          <button className="ui-btn ui-btn-secondary flex h-9 w-9 items-center justify-center" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 px-4 py-4 pb-6 xl:min-h-full xl:grid-cols-3 xl:gap-5 xl:overflow-hidden xl:p-4">
            <div className="xl:min-h-0 xl:h-full xl:overflow-y-auto xl:pr-1">
              <OrderFormCustomerDevice
                brand={brand}
                customBrand={customBrand}
                customerName={customerName}
                customerPhone={customerPhone}
                customerSuggestions={customerSuggestions}
                model={model}
                phonePlaceholder="输入电话搜索客户"
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
            </div>

            <div className="overflow-x-hidden xl:min-h-0 xl:h-full xl:overflow-y-auto xl:px-1">
              <OrderFormFaultSection
                faultNote={faultNote}
                faultNotePlaceholder="详细描述故障情况..."
                setFaultNote={setFaultNote}
                selectedFaults={selectedFaults}
                setSelectedFaults={setSelectedFaults}
                title="故障诊断"
                titleIcon={<IconSearch className="h-4 w-4 text-neutral-600" />}
              />
            </div>

            <div className="space-y-4 overflow-x-hidden xl:min-h-0 xl:h-full xl:overflow-y-auto xl:pl-1">
              <SectionTitle icon={<IconMoney className="h-4 w-4 text-neutral-600" />} title="报价 & 服务" />
              <FaultPriceLineInputs
                lines={faultLines}
                prices={faultPrices}
                onPriceChange={(key, value) => setFaultPrices((p) => ({ ...p, [key]: value }))}
              />
              <FinancialSummaryThree
                depositInput={
                  <input
                    className="ui-input h-10 w-full max-w-[140px] md:h-9"
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="0"
                    type="number"
                    value={deposit}
                  />
                }
                orderTotal={orderTotal}
                receivable={receivable}
              />

              <OrderFormServiceMeta
                internalTag={internalTag}
                setInternalTag={setInternalTag}
                setTechnician={setTechnician}
                setWarranty={setWarranty}
                technician={technician}
                warranty={warranty}
                showPauseReason={false}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">{error && <span className="text-xs text-rose-600">{error}</span>}</div>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <button className="ui-btn ui-btn-secondary h-10 flex-1 px-4 md:h-9 sm:flex-none" onClick={handleDraftPrint} type="button">
              打印草稿
            </button>
            <button className="ui-btn ui-btn-secondary h-10 flex-1 px-4 md:h-9 sm:flex-none" onClick={onClose} type="button">
              取消
            </button>
            <button className="ui-btn ui-btn-primary h-10 flex-1 px-4 md:h-9 sm:flex-none disabled:opacity-60" disabled={pending} onClick={handleSubmit} type="button">
              {pending ? "创建中..." : "创建订单"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
