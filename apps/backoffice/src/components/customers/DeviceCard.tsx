"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Device = {
  id: string;
  brand: string;
  model: string;
  serialOrImei: string | null;
  createdAt: string;
};

type Props = {
  customerId: string;
  devices: Device[];
};

export function DeviceCard({ customerId, devices }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-display text-sm font-semibold text-foreground">设备 ({devices.length})</h2>
      {devices.length === 0 ? (
        <div className="py-3 text-sm text-muted-foreground">暂无设备记录</div>
      ) : (
        <div className="space-y-2">
          {devices.map((d) =>
            editingId === d.id ? (
              <DeviceEditForm
                key={d.id}
                customerId={customerId}
                device={d}
                onCancel={() => setEditingId(null)}
                onSaved={() => { setEditingId(null); router.refresh(); }}
              />
            ) : (
              <DeviceItem
                key={d.id}
                customerId={customerId}
                device={d}
                onEdit={() => setEditingId(d.id)}
                onDeleted={() => router.refresh()}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function DeviceItem({
  customerId,
  device,
  onEdit,
  onDeleted,
}: {
  customerId: string;
  device: Device;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`确认删除设备 ${device.brand} ${device.model}？`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/customers/${customerId}/devices/${device.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">{device.brand} {device.model}</div>
          {device.serialOrImei && (
            <div className="mt-0.5 text-xs text-muted-foreground">IMEI/SN: {device.serialOrImei}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="text-[11px] text-primary hover:underline" onClick={onEdit} type="button">编辑</button>
          <button className="text-[11px] text-status-danger-foreground hover:underline disabled:opacity-60" disabled={deleting} onClick={handleDelete} type="button">
            {deleting ? "..." : "删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeviceEditForm({
  customerId,
  device,
  onCancel,
  onSaved,
}: {
  customerId: string;
  device: Device;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [brand, setBrand] = useState(device.brand);
  const [model, setModel] = useState(device.model);
  const [serial, setSerial] = useState(device.serialOrImei ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand.trim(),
          model: model.trim(),
          serialOrImei: serial.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input className="ui-input text-xs" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="品牌" />
        <input className="ui-input text-xs" value={model} onChange={(e) => setModel(e.target.value)} placeholder="型号" />
        <input className="ui-input text-xs" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="IMEI/SN" />
      </div>
      {error && <div className="text-xs text-status-danger-foreground">{error}</div>}
      <div className="flex gap-2">
        <button className="ui-btn ui-btn-primary h-8 px-3 text-xs disabled:opacity-60" disabled={pending} onClick={handleSave} type="button">
          {pending ? "..." : "保存"}
        </button>
        <button className="ui-btn ui-btn-secondary h-8 px-3 text-xs" onClick={onCancel} type="button">取消</button>
      </div>
    </div>
  );
}
