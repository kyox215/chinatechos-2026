"use client";

import { useEffect, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  short_name: string;
  color: string;
  contact: string | null;
  notes: string | null;
};

const PRESET_COLORS = [
  { key: "red", bg: "bg-status-danger-foreground" },
  { key: "orange", bg: "bg-status-warn-foreground" },
  { key: "amber", bg: "bg-status-warn-foreground" },
  { key: "green", bg: "bg-status-success-foreground" },
  { key: "teal", bg: "bg-status-success-foreground" },
  { key: "blue", bg: "bg-status-info-foreground" },
  { key: "indigo", bg: "bg-status-progress-foreground" },
  { key: "violet", bg: "bg-primary" },
  { key: "pink", bg: "bg-status-danger-foreground" },
  { key: "slate", bg: "bg-muted-foreground" },
];

export function SupplierManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = (await res.json()) as { items?: Supplier[] };
      setSuppliers(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此供应商？关联工单的供应商信息将被清除。")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          className="ui-btn ui-btn-primary h-9 px-4 text-sm"
          onClick={() => setShowAdd(true)}
          type="button"
        >
          新增供应商
        </button>
      </div>

      {showAdd && (
        <SupplierForm
          onCancel={() => setShowAdd(false)}
          onSaved={(s) => { setSuppliers((prev) => [...prev, s]); setShowAdd(false); }}
        />
      )}

      {suppliers.length === 0 && !showAdd && (
        <div className="rounded-xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          暂无供应商，点击上方按钮添加。
        </div>
      )}

      <div className="space-y-2">
        {suppliers.map((s) =>
          editingId === s.id ? (
            <SupplierForm
              key={s.id}
              supplier={s}
              onCancel={() => setEditingId(null)}
              onSaved={(updated) => {
                setSuppliers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                setEditingId(null);
              }}
            />
          ) : (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <ColorDot color={s.color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <SupplierTag name={s.short_name} color={s.color} />
                </div>
                {s.contact && <div className="text-xs text-muted-foreground">{s.contact}</div>}
                {s.notes && <div className="text-xs text-muted-foreground">{s.notes}</div>}
              </div>
              <div className="flex gap-1.5">
                <button
                  className="ui-btn ui-btn-secondary h-8 px-3 text-xs"
                  onClick={() => setEditingId(s.id)}
                  type="button"
                >
                  编辑
                </button>
                <button
                  className="ui-btn h-8 rounded-lg border border-status-danger bg-status-danger px-3 text-xs text-status-danger-foreground hover:bg-status-danger"
                  onClick={() => handleDelete(s.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function SupplierForm({
  supplier,
  onCancel,
  onSaved,
}: {
  supplier?: Supplier;
  onCancel: () => void;
  onSaved: (s: Supplier) => void;
}) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [shortName, setShortName] = useState(supplier?.short_name ?? "");
  const [color, setColor] = useState(supplier?.color ?? "blue");
  const [contact, setContact] = useState(supplier?.contact ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim() || !shortName.trim()) {
      setError("名称和缩写必填");
      return;
    }
    setPending(true);
    setError("");
    try {
      const url = supplier ? `/api/suppliers/${supplier.id}` : "/api/suppliers";
      const method = supplier ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), shortName: shortName.trim(), color, contact: contact.trim(), notes: notes.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      onSaved(data as Supplier);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">名称 *</label>
          <input className="ui-input w-full" onChange={(e) => setName(e.target.value)} placeholder="供应商全名" value={name} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">缩写标签 *</label>
          <input className="ui-input w-full" onChange={(e) => setShortName(e.target.value)} placeholder="2-4字缩写" value={shortName} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">联系方式</label>
          <input className="ui-input w-full" onChange={(e) => setContact(e.target.value)} placeholder="手机/WhatsApp" value={contact} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">备注</label>
          <input className="ui-input w-full" onChange={(e) => setNotes(e.target.value)} placeholder="可选" value={notes} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground">选择颜色</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.key}
              className={`h-7 w-7 rounded-full ${c.bg} ring-offset-2 transition-all ${
                color === c.key ? "ring-2 ring-foreground" : "ring-0 hover:ring-2 hover:ring-border"
              }`}
              onClick={() => setColor(c.key)}
              title={c.key}
              type="button"
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">预览：</span>
          <SupplierTag name={shortName || "缩写"} color={color} />
        </div>
      </div>

      {error && <div className="text-xs text-status-danger-foreground">{error}</div>}

      <div className="flex gap-2">
        <button
          className="ui-btn ui-btn-primary h-9 px-4 text-sm disabled:opacity-60"
          disabled={pending}
          onClick={handleSubmit}
          type="button"
        >
          {pending ? "保存中..." : supplier ? "保存修改" : "创建"}
        </button>
        <button className="ui-btn ui-btn-secondary h-9 px-4 text-sm" onClick={onCancel} type="button">
          取消
        </button>
      </div>
    </div>
  );
}

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  red: { bg: "bg-status-danger", text: "text-status-danger-foreground" },
  orange: { bg: "bg-status-warn", text: "text-status-warn-foreground" },
  amber: { bg: "bg-status-warn", text: "text-status-warn-foreground" },
  green: { bg: "bg-status-success", text: "text-status-success-foreground" },
  teal: { bg: "bg-status-success", text: "text-status-success-foreground" },
  blue: { bg: "bg-status-info", text: "text-status-info-foreground" },
  indigo: { bg: "bg-status-progress", text: "text-status-progress-foreground" },
  violet: { bg: "bg-status-progress", text: "text-status-progress-foreground" },
  pink: { bg: "bg-status-danger", text: "text-status-danger-foreground" },
  slate: { bg: "bg-status-neutral", text: "text-status-neutral-foreground" },
};

function SupplierTag({ name, color }: { name: string; color: string }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}>
      {name}
    </span>
  );
}

function ColorDot({ color }: { color: string }) {
  const dotBg = PRESET_COLORS.find((c) => c.key === color)?.bg ?? "bg-blue-500";
  return <span className={`h-3 w-3 shrink-0 rounded-full ${dotBg}`} />;
}
