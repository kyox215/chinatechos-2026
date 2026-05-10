"use client";

import { useState, type ReactNode } from "react";
import { BarcodeScanner } from "@/components/orders/BarcodeScanner";
import { FaultSelector } from "@/components/orders/FaultSelector";
import { ImeiImageRecognizer } from "@/components/orders/ImeiImageRecognizer";
import { ImeiRecognizerPicker } from "@/components/orders/ImeiRecognizerPicker";

export const ORDER_FORM_BRANDS = ["Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus", "OPPO", "vivo", "Google", "其他"];

type Sug = { id: string; name: string | null; phoneE164: string };

export function OrderFormCustomerDevice(props: {
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  customBrand: string;
  setCustomBrand: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  serialOrImei: string;
  setSerialOrImei: (v: string) => void;
  customerSuggestions: Sug[];
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  scannerOpen: boolean;
  setScannerOpen: (v: boolean) => void;
  inputClass?: string;
  phonePlaceholder?: string;
}) {
  const ic = props.inputClass ?? "";
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-muted-foreground">客户信息</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="relative">
            <label className="mb-0.5 block text-[11px] text-muted-foreground">电话</label>
            <input
              className={`ui-input w-full ${ic}`}
              value={props.customerPhone}
              onChange={(e) => props.setCustomerPhone(e.target.value)}
              onFocus={() => props.customerSuggestions.length > 0 && props.setShowSuggestions(true)}
              onBlur={() => setTimeout(() => props.setShowSuggestions(false), 150)}
              placeholder={props.phonePlaceholder ?? "输入电话搜索"}
            />
            {props.showSuggestions && props.customerSuggestions.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-border bg-surface p-1 shadow-lg">
                {props.customerSuggestions.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                    onMouseDown={() => {
                      props.setCustomerPhone(c.phoneE164);
                      props.setCustomerName(c.name ?? "");
                      props.setShowSuggestions(false);
                    }}
                    type="button"
                  >
                    <span className="font-medium text-foreground">{c.name ?? "未命名"}</span>
                    <span className="text-muted-foreground">{c.phoneE164}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] text-muted-foreground">姓名</label>
            <input
              className={`ui-input w-full ${ic}`}
              value={props.customerName}
              onChange={(e) => props.setCustomerName(e.target.value)}
              placeholder="客户姓名 (可选)"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-muted-foreground">设备信息</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-0.5 block text-[11px] text-muted-foreground">品牌</label>
            <select className={`ui-input w-full ${ic}`} value={props.brand} onChange={(e) => props.setBrand(e.target.value)}>
              <option value="">选择品牌</option>
              {ORDER_FORM_BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {props.brand === "其他" && (
              <input
                className={`ui-input mt-2 w-full ${ic}`}
                value={props.customBrand}
                onChange={(e) => props.setCustomBrand(e.target.value)}
                placeholder="输入品牌名"
              />
            )}
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] text-muted-foreground">型号</label>
            <input
              className={`ui-input w-full ${ic}`}
              value={props.model}
              onChange={(e) => props.setModel(e.target.value)}
              placeholder="例如: iPhone 13"
            />
          </div>
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] text-muted-foreground">IMEI / 序列号</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={`ui-input flex-1 ${ic}`} value={props.serialOrImei} onChange={(e) => props.setSerialOrImei(e.target.value)} placeholder="可选" />
            <button
              className="ui-btn ui-btn-secondary flex h-11 shrink-0 items-center justify-center gap-1 px-3 text-xs md:h-10 md:px-2"
              onClick={() => props.setScannerOpen(true)}
              title="识别 IMEI"
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.375v1.5H5.25v3H3.75v-3.375zM3.75 15.75v3.375c0 .621.504 1.125 1.125 1.125h3.375v-1.5H5.25v-3H3.75zm16.5-10.875v3.375h-1.5v-3h-3v-1.5h3.375c.621 0 1.125.504 1.125 1.125zm-1.5 10.875v3h-3v1.5h3.375c.621 0 1.125-.504 1.125-1.125V15.75h-1.5zM7.5 9v6h1.5V9H7.5zm3 0v6h3V9h-3zm4.5 0v6h1.5V9H15z" />
              </svg>
              <span className="md:hidden">识别 IMEI</span>
            </button>
          </div>
        </div>
        <ImeiRecognizerPicker
          open={props.scannerOpen}
          onClose={() => props.setScannerOpen(false)}
          onPickMode={(mode) => {
            props.setScannerOpen(false);
            if (mode === "barcode") setBarcodeOpen(true);
            else setOcrOpen(true);
          }}
        />
        <BarcodeScanner open={barcodeOpen} onScan={(v) => props.setSerialOrImei(v)} onClose={() => setBarcodeOpen(false)} />
        <ImeiImageRecognizer open={ocrOpen} onPick={(v) => props.setSerialOrImei(v)} onClose={() => setOcrOpen(false)} />
      </fieldset>
    </div>
  );
}

export function OrderFormFaultSection(props: {
  selectedFaults: Map<string, string[]>;
  setSelectedFaults: (m: Map<string, string[]>) => void;
  faultNote: string;
  setFaultNote: (v: string) => void;
  faultNotePlaceholder?: string;
  title?: string;
  titleIcon?: ReactNode;
  inputClass?: string;
  hideHeading?: boolean;
}) {
  const ic = props.inputClass ?? "";
  return (
    <div className="space-y-4 overflow-x-hidden">
      {!props.hideHeading && props.title ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground font-display">
          {props.titleIcon}
          <span>{props.title}</span>
        </div>
      ) : null}
      {!props.hideHeading && !props.title ? (
        <div className="text-xs font-semibold text-muted-foreground">故障诊断</div>
      ) : null}
      <FaultSelector selected={props.selectedFaults} onChange={props.setSelectedFaults} />
      <div>
        <label className="mb-0.5 block text-[11px] text-muted-foreground">故障备注 / 其他问题</label>
        <textarea
          className={`ui-input min-h-[60px] w-full py-2 ${ic}`}
          placeholder={props.faultNotePlaceholder ?? "详细描述故障情况..."}
          value={props.faultNote}
          onChange={(e) => props.setFaultNote(e.target.value)}
        />
      </div>
    </div>
  );
}

export function OrderFormServiceMeta(props: {
  technician: string;
  setTechnician: (v: string) => void;
  warranty: string;
  setWarranty: (v: string) => void;
  internalTag: string;
  setInternalTag: (v: string) => void;
  pauseReason?: string;
  setPauseReason?: (v: string) => void;
  showPauseReason?: boolean;
  inputClass?: string;
}) {
  const ic = props.inputClass ?? "";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-0.5 block text-[11px] text-muted-foreground">技术员</label>
          <input className={`ui-input w-full ${ic}`} value={props.technician} onChange={(e) => props.setTechnician(e.target.value)} placeholder="可选" />
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] text-muted-foreground">保修</label>
          <select className={`ui-input w-full ${ic}`} value={props.warranty} onChange={(e) => props.setWarranty(e.target.value)}>
            <option value="3个月">3个月</option>
            <option value="6个月">6个月</option>
            <option value="12个月">12个月</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-0.5 block text-[11px] text-muted-foreground">配件标签</label>
        <input
          className={`ui-input w-full ${ic}`}
          value={props.internalTag}
          onChange={(e) => props.setInternalTag(e.target.value)}
          placeholder="如: SIM卡, 手机壳"
        />
      </div>
      {props.showPauseReason ? (
        <div>
          <label className="mb-0.5 block text-[11px] text-muted-foreground">暂停原因</label>
          <input
            className={`ui-input w-full ${ic}`}
            value={props.pauseReason ?? ""}
            onChange={(e) => props.setPauseReason?.(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
