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
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">门店信息</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">门店名称</label>
            <input
              className="ui-input w-full"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">门店短号 (store_code)</label>
            <input
              className="ui-input w-full"
              onChange={(e) => setStoreCode(e.target.value)}
              value={storeCode}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">时区</label>
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
            <label className="mb-1 block text-xs text-neutral-500">门店 ID</label>
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
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">自动化参数</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              报价确认超时提醒（小时）
            </label>
            <input
              className="ui-input w-full"
              min="1"
              onChange={(e) => setApprovalHours(e.target.value)}
              type="number"
              value={approvalHours}
            />
            <div className="mt-1 text-xs text-neutral-400">
              客户在 waiting_approval 状态超过此时间后，Dashboard 高亮显示
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              未取件超时提醒（天）
            </label>
            <input
              className="ui-input w-full"
              min="1"
              onChange={(e) => setPickupDays(e.target.value)}
              type="number"
              value={pickupDays}
            />
            <div className="mt-1 text-xs text-neutral-400">
              完工后超过此天数未取件，Dashboard 高亮显示
            </div>
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
            className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-rose-600"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
