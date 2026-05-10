"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StoreSettings } from "@/lib/data/store-settings";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [name, setName] = useState(settings.name);
  const [storeCode, setStoreCode] = useState(settings.storeCode);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [approvalHours, setApprovalHours] = useState(String(settings.approvalOverdueHours));
  const [pickupDays, setPickupDays] = useState(String(settings.pickupOverdueDays));
  const [printPaper, setPrintPaper] = useState<"A5" | "A4">(settings.printPaper);
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">(settings.printOrientation);
  const [printDensity, setPrintDensity] = useState<"compact" | "normal" | "relaxed">(settings.printDensity);
  const [printMarginMm, setPrintMarginMm] = useState<3 | 5 | 8>(settings.printMarginMm);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stores/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          storeCode: storeCode.trim(),
          timezone: timezone.trim(),
          approvalOverdueHours: Number(approvalHours),
          pickupOverdueDays: Number(pickupDays),
          printPaper,
          printOrientation,
          printDensity,
          printMarginMm,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setMessage({ type: "success", text: "设置已保存" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "保存失败" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Store info */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-display text-sm font-semibold text-foreground">门店信息</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">门店名称</label>
            <input
              className="ui-input w-full"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">门店短号 (store_code)</label>
            <input
              className="ui-input w-full"
              onChange={(e) => setStoreCode(e.target.value)}
              value={storeCode}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">时区</label>
            <select
              className="ui-input w-full"
              onChange={(e) => setTimezone(e.target.value)}
              value={timezone}
            >
              <option value="Europe/Rome">Europe/Rome</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="Asia/Shanghai">Asia/Shanghai</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">门店 ID</label>
            <input
              className="ui-input w-full bg-muted"
              disabled
              value={settings.id}
            />
          </div>
        </div>
      </section>

      {/* Automation params */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-display text-sm font-semibold text-foreground">自动化参数</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              报价确认超时提醒（小时）
            </label>
            <input
              className="ui-input w-full"
              min="1"
              onChange={(e) => setApprovalHours(e.target.value)}
              type="number"
              value={approvalHours}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              客户在 waiting_approval 状态超过此时间后，Dashboard 高亮显示
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              未取件超时提醒（天）
            </label>
            <input
              className="ui-input w-full"
              min="1"
              onChange={(e) => setPickupDays(e.target.value)}
              type="number"
              value={pickupDays}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              完工后超过此天数未取件，Dashboard 高亮显示
            </div>
          </div>
        </div>
      </section>

      {/* Print defaults */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-display text-sm font-semibold text-foreground">打印默认参数</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">纸张</label>
            <select
              className="ui-input w-full"
              onChange={(e) => setPrintPaper(e.target.value as "A5" | "A4")}
              value={printPaper}
            >
              <option value="A5">A5</option>
              <option value="A4">A4</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">方向</label>
            <select
              className="ui-input w-full"
              onChange={(e) => setPrintOrientation(e.target.value as "landscape" | "portrait")}
              value={printOrientation}
            >
              <option value="landscape">横向</option>
              <option value="portrait">竖向</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">密度</label>
            <select
              className="ui-input w-full"
              onChange={(e) => setPrintDensity(e.target.value as "compact" | "normal" | "relaxed")}
              value={printDensity}
            >
              <option value="compact">紧凑</option>
              <option value="normal">标准</option>
              <option value="relaxed">宽松</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">边距</label>
            <select
              className="ui-input w-full"
              onChange={(e) => setPrintMarginMm(Number(e.target.value) as 3 | 5 | 8)}
              value={String(printMarginMm)}
            >
              <option value="3">3 mm</option>
              <option value="5">5 mm</option>
              <option value="8">8 mm</option>
            </select>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          className="ui-btn ui-btn-primary h-10 px-6 md:h-9 disabled:opacity-60"
          disabled={pending}
          onClick={handleSave}
          type="button"
        >
          {pending ? "保存中..." : "保存设置"}
        </button>
        {message && (
          <span
            className={`text-sm ${message.type === "success" ? "text-status-success-foreground" : "text-status-danger-foreground"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
