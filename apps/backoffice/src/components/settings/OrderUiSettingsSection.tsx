"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OrderUiConfigV1, PaletteKey, ResolvedOrderUi } from "@/lib/domain/order-ui-config";
import { IconChevronDown, IconChevronUp } from "@/components/icons";
import {
  defaultResolvedOrderUi,
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
  const fingerprint = useMemo(
    () => JSON.stringify(resolvedOrderUiToStored(props.resolved)),
    [props.resolved],
  );
  return <OrderUiSettingsSectionInner key={fingerprint} resolved={props.resolved} />;
}

function OrderUiSettingsSectionInner(props: { resolved: ResolvedOrderUi }) {
  const router = useRouter();
  const [draft, setDraft] = useState<OrderUiConfigV1>(() =>
    cloneOrderUi(resolvedOrderUiToStored(props.resolved)),
  );
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

      {/* 状态与排序（合并） */}
      <div className="mb-6 rounded-xl border border-border bg-surface-2 p-3 md:p-4">
        <h3 className="text-xs font-semibold text-neutral-900">状态与排序</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-neutral-600">
          列表与下拉的先后顺序以下方顺序为准；允许多个枚举值共用同一展示名（例如不同阶段都显示「报价」）。
        </p>

        {/* 移动端：卡片列表 */}
        <div className="mt-3 space-y-3 md:hidden">
          {statusOrder.map((key, i) => (
            <div
              key={key}
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="break-all font-mono text-xs font-medium text-neutral-800">{key}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-neutral-600">
                  {i + 1}/{statusOrder.length}
                </span>
              </div>
              <label className="mb-1 block text-[11px] text-neutral-500">展示名</label>
              <input
                className="ui-input h-10 w-full text-sm md:h-9"
                value={draft.statusLabels?.[key] ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    statusLabels: { ...d.statusLabels, [key]: e.target.value },
                  }))
                }
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  aria-label="上移"
                  className="ui-btn ui-btn-secondary flex min-h-10 min-w-10 items-center justify-center p-0 md:min-h-9 md:min-w-9"
                  disabled={i === 0}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      statusOrder: moveArray(d.statusOrder ?? [], i, -1),
                    }))
                  }
                  type="button"
                >
                  <IconChevronUp className="h-4 w-4" />
                </button>
                <button
                  aria-label="下移"
                  className="ui-btn ui-btn-secondary flex min-h-10 min-w-10 items-center justify-center p-0 md:min-h-9 md:min-w-9"
                  disabled={i >= statusOrder.length - 1}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      statusOrder: moveArray(d.statusOrder ?? [], i, 1),
                    }))
                  }
                  type="button"
                >
                  <IconChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 桌面端：表格 */}
        <div className="mt-3 hidden max-h-[min(28rem,65vh)] overflow-auto rounded-lg border border-border md:block">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-[1] bg-muted/90 backdrop-blur-sm">
              <tr className="text-left text-neutral-600">
                <th className="w-10 whitespace-nowrap px-2 py-2 font-medium">#</th>
                <th className="min-w-[6rem] px-2 py-2 font-medium">枚举键</th>
                <th className="min-w-[10rem] px-2 py-2 font-medium">展示名</th>
                <th className="w-[5.5rem] px-2 py-2 text-right font-medium">调整</th>
              </tr>
            </thead>
            <tbody>
              {statusOrder.map((key, i) => (
                <tr key={key} className="border-t border-border">
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-neutral-500">{i + 1}</td>
                  <td className="break-all px-2 py-1.5 font-mono text-neutral-700">{key}</td>
                  <td className="px-2 py-1">
                    <input
                      className="ui-input h-9 w-full text-xs"
                      value={draft.statusLabels?.[key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          statusLabels: { ...d.statusLabels, [key]: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex justify-end gap-1">
                      <button
                        aria-label="上移"
                        className="ui-btn ui-btn-secondary inline-flex h-9 w-9 shrink-0 items-center justify-center p-0"
                        disabled={i === 0}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            statusOrder: moveArray(d.statusOrder ?? [], i, -1),
                          }))
                        }
                        type="button"
                      >
                        <IconChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="下移"
                        className="ui-btn ui-btn-secondary inline-flex h-9 w-9 shrink-0 items-center justify-center p-0"
                        disabled={i >= statusOrder.length - 1}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            statusOrder: moveArray(d.statusOrder ?? [], i, 1),
                          }))
                        }
                        type="button"
                      >
                        <IconChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 大分组 */}
      <div className="mb-6 space-y-3 border-t border-border pt-6">
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
