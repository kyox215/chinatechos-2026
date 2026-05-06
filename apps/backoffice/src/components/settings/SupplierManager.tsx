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
  { key: "red", bg: "bg-red-500" },
  { key: "orange", bg: "bg-orange-500" },
  { key: "amber", bg: "bg-amber-500" },
  { key: "green", bg: "bg-green-500" },
  { key: "teal", bg: "bg-teal-500" },
  { key: "blue", bg: "bg-blue-500" },
  { key: "indigo", bg: "bg-indigo-500" },
  { key: "violet", bg: "bg-violet-500" },
  { key: "pink", bg: "bg-pink-500" },
  { key: "slate", bg: "bg-slate-500" },
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
    return <div className="rounded-xl border border-border p-6 text-sm text-neutral-500">加载中...</div>;
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
        <div className="rounded-xl border border-border px-4 py-8 text-center text-sm text-neutral-500">
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
                  <span className="text-sm font-medium text-neutral-900">{s.name}</span>
                  <SupplierTag name={s.short_name} color={s.color} />
                </div>
                {s.contact && <div className="text-xs text-neutral-500">{s.contact}</div>}
                {s.notes && <div className="text-xs text-neutral-400">{s.notes}</div>}
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
                  className="ui-btn h-8 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs text-rose-600 hover:bg-rose-100"
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
          <label className="mb-1 block text-xs text-neutral-500">名称 *</label>
          <input className="ui-input w-full" onChange={(e) => setName(e.target.value)} placeholder="供应商全名" value={name} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">缩写标签 *</label>
          <input className="ui-input w-full" onChange={(e) => setShortName(e.target.value)} placeholder="2-4字缩写" value={shortName} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">联系方式</label>
          <input className="ui-input w-full" onChange={(e) => setContact(e.target.value)} placeholder="手机/WhatsApp" value={contact} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">备注</label>
          <input className="ui-input w-full" onChange={(e) => setNotes(e.target.value)} placeholder="可选" value={notes} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-neutral-500">选择颜色</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.key}
              className={`h-7 w-7 rounded-full ${c.bg} ring-offset-2 transition-all ${
                color === c.key ? "ring-2 ring-neutral-900" : "ring-0 hover:ring-2 hover:ring-neutral-300"
              }`}
              onClick={() => setColor(c.key)}
              title={c.key}
              type="button"
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-neutral-500">预览：</span>
          <SupplierTag name={shortName || "缩写"} color={color} />
        </div>
      </div>

      {error && <div className="text-xs text-rose-600">{error}</div>}

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
