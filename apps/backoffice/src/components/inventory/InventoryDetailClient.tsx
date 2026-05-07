"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  formatInventoryBadgesFromQa,
  inventoryStatusClass,
  presentInventoryChannel,
  presentInventoryStatus,
} from "@/lib/domain/inventory-presentation";
import {
  buildInventorySalePrintPayload,
  buildTradeInAgreementPrintPayload,
} from "@/lib/domain/inventory-print-it";
import {
  InventoryAttachmentsSection,
  type InventoryAttachmentClientVm,
} from "@/components/inventory/InventoryAttachmentsSection";
import { InventoryPrintButton } from "@/components/inventory/InventoryPrintButton";
import { TradeInAgreementPrintButton } from "@/components/inventory/TradeInAgreementPrintButton";
import type { InventoryEventVM } from "@/components/inventory/InventoryTimeline";
import { InventoryTimeline } from "@/components/inventory/InventoryTimeline";

type QaCat = "screen" | "camera_rear" | "battery";

type QaCatState = {
  result: "ok" | "defect" | "na";
  label_keys: string[];
  note: string;
};

const DEF_LABELS: Record<QaCat, { key: string; label: string }[]> = {
  screen: [
    { key: "screen_crack", label: "屏幕碎裂" },
    { key: "housing_scratch", label: "外壳划痕" },
  ],
  camera_rear: [{ key: "camera_lens_scratch", label: "摄像头刮花" }],
  battery: [{ key: "battery_low", label: "电池老化" }],
};

function normalizeCat(raw: unknown): QaCatState {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Partial<QaCatState>;
    const r = o.result === "defect" || o.result === "na" || o.result === "ok" ? o.result : "ok";
    return {
      result: r,
      label_keys: Array.isArray(o.label_keys) ? o.label_keys.filter((x) => typeof x === "string") : [],
      note: typeof o.note === "string" ? o.note : "",
    };
  }
  return { result: "ok", label_keys: [], note: "" };
}

export type InventoryDetailVm = {
  id: string;
  public_no: string;
  product_channel: string;
  lifecycle_status: string;
  brand: string;
  model: string;
  imei_or_serial: string | null;
  purchase_cost: number | null;
  list_price: number | null;
  sold_price: number | null;
  qa_report: Record<string, unknown>;
  qa_completed_at: string | null;
  listing_hold_until: string | null;
  imei_check_done: boolean;
  imei_check_note: string | null;
  notes: string | null;
  sellerLabel?: string | null;
  buyerLabel?: string | null;
};

export function InventoryDetailClient(props: {
  item: InventoryDetailVm;
  events: InventoryEventVM[];
  canSell: boolean;
  attachments: InventoryAttachmentClientVm[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [qaScreen, setQaScreen] = useState<QaCatState>(() =>
    normalizeCat(props.item.qa_report.screen),
  );
  const [qaCam, setQaCam] = useState<QaCatState>(() =>
    normalizeCat(props.item.qa_report.camera_rear),
  );
  const [qaBat, setQaBat] = useState<QaCatState>(() =>
    normalizeCat(props.item.qa_report.battery),
  );

  const [imeiDone, setImeiDone] = useState(props.item.imei_check_done);
  const [imeiNote, setImeiNote] = useState(props.item.imei_check_note ?? "");

  const badges = useMemo(
    () => formatInventoryBadgesFromQa(props.item.qa_report as Record<string, unknown>),
    [props.item.qa_report],
  );

  async function patchJson(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || "请求失败");
  }

  async function postJson(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || "请求失败");
  }

  async function saveQa(markComplete: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const qa_report = {
        screen: qaScreen,
        camera_rear: qaCam,
        battery: qaBat,
      };
      await patchJson(`/api/inventory/${props.item.id}`, {
        qaReport: qa_report,
        qaCompleted: markComplete,
      });
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function saveImei() {
    setBusy(true);
    setMsg(null);
    try {
      await patchJson(`/api/inventory/${props.item.id}`, {
        imeiCheckDone: imeiDone,
        imeiCheckNote: imeiNote.trim() || null,
      });
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function transition(to: "reserved" | "sold" | "cancelled", extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      await postJson(`/api/inventory/${props.item.id}/transition`, { to, ...extra });
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  const holdActive =
    props.item.listing_hold_until && new Date(props.item.listing_hold_until) > new Date();

  const tradeInPrintPayload = buildTradeInAgreementPrintPayload({
    publicNo: props.item.public_no,
    brand: props.item.brand,
    model: props.item.model,
    imeiOrSerial: props.item.imei_or_serial,
    sellerLabel: props.item.sellerLabel,
  });

  const printPayload = buildInventorySalePrintPayload({
    publicNo: props.item.public_no,
    productChannel: props.item.product_channel,
    brand: props.item.brand,
    model: props.item.model,
    imeiOrSerial: props.item.imei_or_serial,
    listPrice: props.item.list_price,
    soldPrice: props.item.sold_price ?? props.item.list_price,
    qaReport: {
      screen: qaScreen,
      camera_rear: qaCam,
      battery: qaBat,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="text-sm text-neutral-500 hover:text-neutral-800" href="/inventory">
            ← 返回列表
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{props.item.public_no}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${inventoryStatusClass(props.item.lifecycle_status)}`}
            >
              {presentInventoryStatus(props.item.lifecycle_status)}
            </span>
            <span className="text-xs text-neutral-500">{presentInventoryChannel(props.item.product_channel)}</span>
          </div>
          <div className="mt-1 text-sm text-neutral-600">
            {props.item.brand} {props.item.model}
            {props.item.imei_or_serial ? ` · IMEI ${props.item.imei_or_serial}` : null}
          </div>
          {badges.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {badges.map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200"
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {props.item.product_channel === "trade_in" ? (
            <TradeInAgreementPrintButton inventoryId={props.item.id} payload={tradeInPrintPayload} />
          ) : null}
          {props.item.lifecycle_status === "sold" ? (
            <InventoryPrintButton payload={printPayload} label="Stampa ricevuta" />
          ) : null}
        </div>
      </div>

      {msg ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{msg}</div> : null}

      <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
        <h2 className="mb-2 text-sm font-semibold">合规 / IMEI</h2>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            checked={imeiDone}
            className="mt-1"
            disabled={busy || props.item.product_channel !== "trade_in"}
            onChange={(e) => setImeiDone(e.target.checked)}
            type="checkbox"
          />
          <span>已完成 IMEI / 来源核对（回收机必填）</span>
        </label>
        <div className="mt-2">
          <label className="mb-0.5 block text-[11px] text-neutral-400">备注</label>
          <textarea
            className="ui-input min-h-[72px] w-full md:h-20 md:min-h-0"
            disabled={busy}
            onChange={(e) => setImeiNote(e.target.value)}
            value={imeiNote}
          />
        </div>
        <button
          className="ui-btn ui-btn-secondary mt-3 h-10 px-3 text-xs md:h-9"
          disabled={busy}
          onClick={() => void saveImei()}
          type="button"
        >
          保存 IMEI 核对
        </button>
        {props.item.product_channel === "trade_in" && holdActive && props.item.listing_hold_until ? (
          <p className="mt-2 text-xs text-amber-800">
            冷冻期至{" "}
            {new Intl.DateTimeFormat("it-IT", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Rome",
            }).format(new Date(props.item.listing_hold_until))}{" "}
            （结束前不可售）
          </p>
        ) : null}
        {!props.canSell && props.item.lifecycle_status === "in_stock" ? (
          <p className="mt-2 text-xs text-neutral-500">
            当前不可直接售出：请完成冷冻期（若有）、回收机的 IMEI 核对与质检完成。
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
        <h2 className="mb-3 text-sm font-semibold">质检（分项）</h2>
        <div className="space-y-4">
          <QaBlock
            disabled={busy}
            labels={DEF_LABELS.screen}
            onChange={setQaScreen}
            title="屏幕 / 机身"
            value={qaScreen}
          />
          <QaBlock
            disabled={busy}
            labels={DEF_LABELS.camera_rear}
            onChange={setQaCam}
            title="后置摄像头"
            value={qaCam}
          />
          <QaBlock
            disabled={busy}
            labels={DEF_LABELS.battery}
            onChange={setQaBat}
            title="电池"
            value={qaBat}
          />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            className="ui-btn ui-btn-secondary h-10 px-4 text-xs md:h-9"
            disabled={busy}
            onClick={() => void saveQa(false)}
            type="button"
          >
            保存质检
          </button>
          <button
            className="ui-btn ui-btn-primary h-10 px-4 text-xs md:h-9"
            disabled={busy}
            onClick={() => void saveQa(true)}
            type="button"
          >
            保存并标记质检完成
          </button>
        </div>
        {props.item.qa_completed_at ? (
          <p className="mt-2 text-xs text-emerald-700">
            质检已完成 ·{" "}
            {new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }).format(
              new Date(props.item.qa_completed_at),
            )}
          </p>
        ) : (
          <p className="mt-2 text-xs text-neutral-500">回收机须标记质检完成后才可售。</p>
        )}
      </section>

      <InventoryAttachmentsSection attachments={props.attachments} inventoryId={props.item.id} />

      <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
        <h2 className="mb-2 text-sm font-semibold">关联客户</h2>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="text-xs font-medium text-neutral-500">卖方 / 回收来源</div>
            <div className="mt-1 text-neutral-900">{props.item.sellerLabel ?? "—"}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="text-xs font-medium text-neutral-500">买方（售出后）</div>
            <div className="mt-1 text-neutral-900">{props.item.buyerLabel ?? "—"}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
        <h2 className="mb-3 text-sm font-semibold">操作</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            className="ui-btn ui-btn-secondary h-10 px-4 text-xs md:h-9"
            disabled={busy || props.item.lifecycle_status !== "in_stock" || !props.canSell}
            onClick={() => void transition("reserved")}
            type="button"
          >
            转为预留
          </button>
          <SellButton
            busy={busy}
            disabled={props.item.lifecycle_status !== "in_stock" || !props.canSell}
            onSell={(buyerPhone, buyerName, soldPrice) =>
              void transition("sold", {
                buyerPhone,
                buyerName,
                soldPrice: soldPrice !== undefined && Number.isFinite(soldPrice) ? soldPrice : undefined,
              })
            }
          />
          <button
            className="ui-btn ui-btn-secondary h-10 px-4 text-xs md:h-9"
            disabled={
              busy ||
              props.item.lifecycle_status === "sold" ||
              props.item.lifecycle_status === "cancelled"
            }
            onClick={() => void transition("cancelled")}
            type="button"
          >
            取消库存
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-3 md:p-4">
        <h2 className="mb-3 text-sm font-semibold">操作时间线</h2>
        <InventoryTimeline events={props.events} />
      </section>
    </div>
  );
}

function QaBlock(props: {
  title: string;
  value: QaCatState;
  onChange: (v: QaCatState) => void;
  labels: { key: string; label: string }[];
  disabled?: boolean;
}) {
  const v = props.value;
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="text-sm font-medium text-neutral-900">{props.title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["ok", "defect", "na"] as const).map((r) => (
          <button
            key={r}
            className={[
              "rounded-xl px-3 py-1.5 text-xs ring-1 transition-colors",
              v.result === r
                ? "bg-primary-2 text-foreground ring-primary/25"
                : "bg-surface text-neutral-700 ring-border hover:bg-muted",
            ].join(" ")}
            disabled={props.disabled}
            onClick={() => props.onChange({ ...v, result: r })}
            type="button"
          >
            {r === "ok" ? "正常" : r === "defect" ? "缺陷" : "不适用"}
          </button>
        ))}
      </div>
      {v.result === "defect" ? (
        <div className="mt-2 space-y-1">
          {props.labels.map((lb) => (
            <label key={lb.key} className="flex items-center gap-2 text-sm">
              <input
                checked={v.label_keys.includes(lb.key)}
                disabled={props.disabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  const next = new Set(v.label_keys);
                  if (on) next.add(lb.key);
                  else next.delete(lb.key);
                  props.onChange({ ...v, label_keys: [...next] });
                }}
                type="checkbox"
              />
              {lb.label}
            </label>
          ))}
          <input
            className="ui-input mt-1 h-10 w-full md:h-9"
            disabled={props.disabled}
            onChange={(e) => props.onChange({ ...v, note: e.target.value })}
            placeholder="补充说明"
            value={v.note}
          />
        </div>
      ) : null}
    </div>
  );
}

function SellButton(props: {
  disabled: boolean;
  busy: boolean;
  onSell: (buyerPhone: string, buyerName: string, soldPrice: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [soldPrice, setSoldPrice] = useState("");

  return (
    <>
      <button
        className="ui-btn ui-btn-primary h-10 px-4 text-xs md:h-9"
        disabled={props.disabled || props.busy}
        onClick={() => setOpen(true)}
        type="button"
      >
        售出
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-4">
          <div className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-lg md:max-h-[85vh] md:max-w-lg md:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">售出确认</span>
              <button className="rounded-xl px-2 py-1 text-sm text-neutral-500" onClick={() => setOpen(false)} type="button">
                关闭
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">买方电话</label>
                <input
                  className="ui-input h-10 w-full md:h-9"
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+39…"
                  value={buyerPhone}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">买方姓名（可选）</label>
                <input
                  className="ui-input h-10 w-full md:h-9"
                  onChange={(e) => setBuyerName(e.target.value)}
                  value={buyerName}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] text-neutral-400">成交价 EUR（可选）</label>
                <input
                  className="ui-input h-10 w-full md:h-9"
                  inputMode="decimal"
                  onChange={(e) => setSoldPrice(e.target.value)}
                  value={soldPrice}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-4 py-3">
              <button className="ui-btn ui-btn-secondary h-10 px-4 text-xs" onClick={() => setOpen(false)} type="button">
                取消
              </button>
              <button
                className="ui-btn ui-btn-primary h-10 px-4 text-xs"
                onClick={() => {
                  const sp = soldPrice.trim() ? Number(soldPrice.replace(",", ".")) : undefined;
                  props.onSell(buyerPhone.trim(), buyerName.trim(), sp);
                  setOpen(false);
                }}
                type="button"
              >
                确认售出
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
