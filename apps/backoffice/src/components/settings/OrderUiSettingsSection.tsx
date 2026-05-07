"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { OrderUiConfigV1, PaletteKey, ResolvedOrderUi } from "@/lib/domain/order-ui-config";
import {
  defaultResolvedOrderUi,
  KNOWN_ORDER_STATUSES,
  PALETTE_OPTIONS,
  resolvedOrderUiToStored,
} from "@/lib/domain/order-ui-config";

const PALETTE_LABEL: Record<PaletteKey, string> = {
  rose: "玫红",
  blue: "蓝色",
  amber: "琥珀",
  teal: "青色",
  emerald: "绿色",
  neutral: "灰色",
};

function cloneOrderUi(c: OrderUiConfigV1): OrderUiConfigV1 {
  return JSON.parse(JSON.stringify(c)) as OrderUiConfigV1;
}

function moveArray<T>(arr: T[], index: number, delta: -1 | 1): T[] {
  const next = [...arr];
  const j = index + delta;
  if (j < 0 || j >= next.length) return arr;
  const tmp = next[index];
  next[index] = next[j];
  next[j] = tmp;
  return next;
}

export function OrderUiSettingsSection(props: { resolved: ResolvedOrderUi }) {
  const router = useRouter();
  const resolvedFingerprint = useMemo(
    () => JSON.stringify(resolvedOrderUiToStored(props.resolved)),
    [props.resolved],
  );
  const [draft, setDraft] = useState<OrderUiConfigV1>(() =>
    cloneOrderUi(resolvedOrderUiToStored(props.resolved)),
  );

  useEffect(() => {
    setDraft(cloneOrderUi(JSON.parse(resolvedFingerprint) as OrderUiConfigV1));
  }, [resolvedFingerprint]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const statusOrder = draft.statusOrder ?? [];
  const macros = draft.macroGroups ?? [];

  async function handleSave() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stores/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderUiConfig: draft }),
      });
      const data = (await res.json()) as { error?: string; errors?: string[] };
      if (!res.ok) {
        throw new Error(data.errors?.join("；") ?? data.error ?? "保存失败");
      }
      setMessage({ type: "success", text: "工单展示设置已保存" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "保存失败" });
    } finally {
      setPending(false);
    }
  }

  function restoreFactoryDefaults() {
    setDraft(cloneOrderUi(resolvedOrderUiToStored(defaultResolvedOrderUi())));
    setMessage({ type: "success", text: "已恢复为内置默认（尚未写入数据库，请点击保存）" });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">工单列表与状态文案</h2>
      <p className="mb-4 text-xs text-neutral-500">
        门店维度配置：列表大分组标题与顺序、状态下拉顺序、徽标旁文案等；保存后立即作用于工单列表与导出。
      </p>

      {/* 列表行寄修/到店标识 */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">寄修标识文案</label>
          <input
            className="ui-input w-full text-sm"
            value={draft.sectionTitles?.mail ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                sectionTitles: { ...d.sectionTitles, mail: e.target.value, shop: d.sectionTitles?.shop ?? "" },
              }))
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">到店标识文案</label>
          <input
            className="ui-input w-full text-sm"
            value={draft.sectionTitles?.shop ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                sectionTitles: { ...d.sectionTitles, mail: d.sectionTitles?.mail ?? "", shop: e.target.value },
              }))
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">寄修判定的工单类型（order_type）</label>
          <select
            className="ui-input w-full text-sm"
            value={draft.mailInOrderType ?? "quick_repair"}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                mailInOrderType: e.target.value as "quick_repair" | "dropoff_repair",
              }))
            }
          >
            <option value="quick_repair">quick_repair（默认寄修）</option>
            <option value="dropoff_repair">dropoff_repair</option>
          </select>
          <p className="mt-1 text-[11px] text-neutral-400">
            与该类型一致的工单在列表行显示「{draft.sectionTitles?.mail ?? "寄修"}」，其余显示「{draft.sectionTitles?.shop ?? "到店"}」。
          </p>
        </div>
      </div>

      {/* 状态文案 */}
      <div className="mb-6">
        <h3 className="mb-2 text-xs font-semibold text-neutral-800">状态文案</h3>
        <div className="max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80">
              <tr className="text-left text-neutral-500">
                <th className="px-2 py-1.5 font-medium">枚举值</th>
                <th className="px-2 py-1.5 font-medium">展示名</th>
              </tr>
            </thead>
            <tbody>
              {KNOWN_ORDER_STATUSES.map((key) => (
                <tr key={key} className="border-t border-border">
                  <td className="px-2 py-1 font-mono text-neutral-600">{key}</td>
                  <td className="px-2 py-1">
                    <input
                      className="ui-input h-7 w-full text-xs"
                      value={draft.statusLabels?.[key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          statusLabels: { ...d.statusLabels, [key]: e.target.value },
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 排序 */}
      <div className="mb-6">
        <h3 className="mb-2 text-xs font-semibold text-neutral-800">列表 / 下拉排序（上移优先）</h3>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {statusOrder.map((key, i) => (
            <li key={key} className="flex items-center gap-2 px-2 py-1.5 text-xs">
              <span className="min-w-0 flex-1 font-mono text-neutral-700">{key}</span>
              <span className="shrink-0 text-neutral-500">{draft.statusLabels?.[key] ?? ""}</span>
              <button
                className="ui-btn ui-btn-secondary h-7 px-2 text-[11px]"
                disabled={i === 0}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    statusOrder: moveArray(d.statusOrder ?? [], i, -1),
                  }))
                }
                type="button"
              >
                上移
              </button>
              <button
                className="ui-btn ui-btn-secondary h-7 px-2 text-[11px]"
                disabled={i >= statusOrder.length - 1}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    statusOrder: moveArray(d.statusOrder ?? [], i, 1),
                  }))
                }
                type="button"
              >
                下移
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 大分组 */}
      <div className="mb-6 space-y-3">
        <h3 className="text-xs font-semibold text-neutral-800">列表大分组</h3>
        {macros.map((mg, mi) => (
          <div key={mg.id} className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-neutral-600">{mg.id}</span>
              <button
                className="ui-btn ui-btn-secondary h-7 px-2 text-[11px]"
                disabled={mi === 0}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    macroGroups: moveArray(d.macroGroups ?? [], mi, -1),
                  }))
                }
                type="button"
              >
                分组上移
              </button>
              <button
                className="ui-btn ui-btn-secondary h-7 px-2 text-[11px]"
                disabled={mi >= macros.length - 1}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    macroGroups: moveArray(d.macroGroups ?? [], mi, 1),
                  }))
                }
                type="button"
              >
                分组下移
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-500">分组标题</label>
                <input
                  className="ui-input w-full text-sm"
                  value={mg.label ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      macroGroups: (d.macroGroups ?? []).map((m, idx) =>
                        idx === mi ? { ...m, label: e.target.value } : m,
                      ),
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-500">配色</label>
                <select
                  className="ui-input w-full text-sm"
                  value={mg.palette ?? "neutral"}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      macroGroups: (d.macroGroups ?? []).map((m, idx) =>
                        idx === mi ? { ...m, palette: e.target.value as PaletteKey } : m,
                      ),
                    }))
                  }
                >
                  {PALETTE_OPTIONS.map((pk) => (
                    <option key={pk} value={pk}>
                      {PALETTE_LABEL[pk]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-neutral-600">
                  <input
                    checked={mg.defaultOpenDesktop ?? false}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        macroGroups: (d.macroGroups ?? []).map((m, idx) =>
                          idx === mi ? { ...m, defaultOpenDesktop: e.target.checked } : m,
                        ),
                      }))
                    }
                    type="checkbox"
                  />
                  桌面端默认展开（移动端始终在首屏折叠）
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-0.5 block text-[11px] text-neutral-500">包含的状态（只读，高级划分请在导出模板或后续版本中扩展）</label>
                <input
                  readOnly
                  className="ui-input w-full bg-muted/40 font-mono text-[11px]"
                  value={(mg.statuses ?? []).join(", ")}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {message ? (
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-xs ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="ui-btn ui-btn-primary h-9 px-4 text-xs font-semibold disabled:opacity-60"
          disabled={pending}
          onClick={handleSave}
          type="button"
        >
          {pending ? "保存中…" : "保存工单展示配置"}
        </button>
        <button
          className="ui-btn ui-btn-secondary h-9 px-4 text-xs font-semibold"
          onClick={restoreFactoryDefaults}
          type="button"
        >
          恢复内置默认
        </button>
      </div>
    </section>
  );
}
