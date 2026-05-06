"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Suggestion = {
  id: string;
  name: string | null;
  phoneE164: string;
  lastOrderAt: string | null;
};

type Props = {
  q?: string;
  status: string;
  orderType: string;
  technician: string;
  paid: string;
  dateFrom?: string;
  dateTo?: string;
  approvalOverdue: boolean;
  pickupOverdue: boolean;
};

export function OrdersSearchControls(props: Props) {
  const router = useRouter();
  const [q, setQ] = useState(props.q ?? "");
  const [status, setStatus] = useState(props.status);
  const [orderType, setOrderType] = useState(props.orderType);
  const [technician, setTechnician] = useState(props.technician === "all" ? "" : props.technician);
  const [paid, setPaid] = useState(props.paid);
  const [dateFrom, setDateFrom] = useState(props.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(props.dateTo ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const [createQuery, setCreateQuery] = useState("");
  const [createSuggestions, setCreateSuggestions] = useState<Suggestion[]>([]);
  const [createSelected, setCreateSelected] = useState<Suggestion | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [serialOrImei, setSerialOrImei] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [createOrderType, setCreateOrderType] = useState<"quick_repair" | "dropoff_repair">("quick_repair");
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (status !== "all") count += 1;
    if (orderType !== "all") count += 1;
    if (paid !== "all") count += 1;
    if (technician.trim()) count += 1;
    if (dateFrom) count += 1;
    if (dateTo) count += 1;
    return count;
  }, [status, orderType, paid, technician, dateFrom, dateTo]);

  useEffect(() => {
    const keyword = q.trim();
    if (keyword.length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const response = await fetch(`/api/customers/suggest?q=${encodeURIComponent(keyword)}&limit=10`);
        const json = (await response.json()) as { items?: Suggestion[] };
        setSuggestions(json.items ?? []);
      } finally {
        setLoadingSuggest(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const keyword = createQuery.trim();
    if (keyword.length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/customers/suggest?q=${encodeURIComponent(keyword)}&limit=8`);
      const json = (await response.json()) as { items?: Suggestion[] };
      setCreateSuggestions(json.items ?? []);
    }, 260);
    return () => clearTimeout(timer);
  }, [createQuery]);

  function applyFilters(next: {
    q?: string;
    status?: string;
    orderType?: string;
    technician?: string;
    paid?: string;
    dateFrom?: string;
    dateTo?: string;
    approvalOverdue?: boolean;
    pickupOverdue?: boolean;
  }) {
    const params = new URLSearchParams();
    const qValue = next.q ?? q;
    if (qValue.trim()) params.set("q", qValue.trim());
    const statusValue = next.status ?? status;
    if (statusValue !== "all") params.set("status", statusValue);
    const orderTypeValue = next.orderType ?? orderType;
    if (orderTypeValue !== "all") params.set("orderType", orderTypeValue);
    const paidValue = next.paid ?? paid;
    if (paidValue !== "all") params.set("paid", paidValue);
    const technicianValue = (next.technician ?? technician).trim();
    if (technicianValue) params.set("technician", technicianValue);
    const dateFromValue = next.dateFrom ?? dateFrom;
    if (dateFromValue) params.set("dateFrom", dateFromValue);
    const dateToValue = next.dateTo ?? dateTo;
    if (dateToValue) params.set("dateTo", dateToValue);
    const approvalOverdue = next.approvalOverdue ?? props.approvalOverdue;
    const pickupOverdue = next.pickupOverdue ?? props.pickupOverdue;
    if (approvalOverdue) params.set("approvalOverdue", "1");
    if (pickupOverdue) params.set("pickupOverdue", "1");
    const query = params.toString();
    router.push(query ? `/orders?${query}` : "/orders");
  }

  return (
    <div className="ui-panel flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            className="ui-input h-10 w-full pl-3 pr-3 md:h-9"
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 100)}
            onFocus={() => setSearchFocused(true)}
            placeholder="实时搜索：电话 / 客户名 / 工单号 / IMEI"
            value={q}
          />
          {searchFocused ? (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-surface p-2 shadow-sm">
              {q.trim().length < 2 ? (
                <div className="px-2 py-2 text-xs text-neutral-500">请输入至少 2 个字符</div>
              ) : loadingSuggest ? (
                <div className="px-2 py-2 text-xs text-neutral-500">搜索中...</div>
              ) : suggestions.length === 0 ? (
                <div className="px-2 py-2 text-xs text-neutral-500">无匹配客户，继续输入可按关键词查工单</div>
              ) : (
                suggestions.map((it) => (
                  <button
                    key={it.id}
                    className="block w-full rounded-lg px-2 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      const keyword = it.phoneE164 || it.name || "";
                      setQ(keyword);
                        setSearchFocused(false);
                      applyFilters({ q: keyword });
                    }}
                    type="button"
                  >
                    <div className="text-sm font-medium text-neutral-900">{it.name ?? "未命名客户"}</div>
                    <div className="text-xs text-neutral-500">{it.phoneE164}</div>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button className="ui-btn ui-btn-primary h-10 px-3 md:h-9" onClick={() => applyFilters({ q })} type="button">
            搜索
          </button>
          <button
            className="ui-btn ui-btn-secondary h-10 px-3 md:h-9"
            onClick={() => setAdvancedOpen((v) => !v)}
            type="button"
          >
            高级筛选{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </button>
          <button className="ui-btn ui-btn-primary h-10 px-4 md:h-9" onClick={() => setCreateOpen(true)} type="button">
            新建工单
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ChipToggle
          active={props.approvalOverdue}
          label="待确认超时"
          onClick={() => applyFilters({ approvalOverdue: !props.approvalOverdue })}
        />
        <ChipToggle
          active={props.pickupOverdue}
          label="超期未取件"
          onClick={() => applyFilters({ pickupOverdue: !props.pickupOverdue })}
        />
        <Link className="ui-btn ui-btn-secondary h-10 px-3 leading-10 md:h-9 md:leading-9" href="/orders">
          清空全部
        </Link>
      </div>

      {advancedOpen ? (
        <div className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <select className="ui-input" onChange={(e) => setStatus(e.target.value)} value={status}>
              <option value="all">状态：全部</option>
              <option value="new">状态：新建</option>
              <option value="diagnosing">状态：检测中</option>
              <option value="waiting_approval">状态：待客户确认报价</option>
              <option value="repairing">状态：维修中</option>
              <option value="waiting_pickup">状态：待取件 / 待付款</option>
              <option value="completed">状态：已完成</option>
              <option value="cancelled">状态：已取消</option>
            </select>
            <select className="ui-input" onChange={(e) => setOrderType(e.target.value)} value={orderType}>
              <option value="all">类型：全部</option>
              <option value="quick_repair">快速维修</option>
              <option value="dropoff_repair">留机维修</option>
            </select>
            <select className="ui-input" onChange={(e) => setPaid(e.target.value)} value={paid}>
              <option value="all">结清：全部</option>
              <option value="yes">结清：已结清</option>
              <option value="no">结清：未结清</option>
            </select>
            <input className="ui-input" onChange={(e) => setTechnician(e.target.value)} placeholder="技师" value={technician} />
            <input className="ui-input" onChange={(e) => setDateFrom(e.target.value)} type="date" value={dateFrom} />
            <input className="ui-input" onChange={(e) => setDateTo(e.target.value)} type="date" value={dateTo} />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="ui-btn ui-btn-primary h-10 px-3 md:h-9"
              onClick={() => applyFilters({ status, orderType, paid, technician, dateFrom, dateTo })}
              type="button"
            >
              应用高级筛选
            </button>
            <button
              className="ui-btn ui-btn-secondary h-10 px-3 md:h-9"
              onClick={() => {
                setStatus("all");
                setOrderType("all");
                setPaid("all");
                setTechnician("");
                setDateFrom("");
                setDateTo("");
                applyFilters({
                  status: "all",
                  orderType: "all",
                  paid: "all",
                  technician: "",
                  dateFrom: "",
                  dateTo: "",
                });
              }}
              type="button"
            >
              重置高级筛选
            </button>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 md:items-center">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-neutral-900">新建工单</div>
                <div className="text-xs text-neutral-500">输入手机号或客户名，自动关联客户</div>
              </div>
              <button className="ui-btn ui-btn-secondary h-9 w-9" onClick={() => setCreateOpen(false)} type="button">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <input
                className="ui-input w-full"
                onChange={(e) => setCreateQuery(e.target.value)}
                placeholder="客户搜索：手机号 / 客户名"
                value={createQuery}
              />
              {createQuery.trim().length >= 2 && createSuggestions.length > 0 ? (
                <div className="max-h-40 overflow-auto rounded-xl border border-border bg-surface-2 p-1">
                  {createSuggestions.map((it) => (
                    <button
                      key={it.id}
                      className="block w-full rounded-lg px-2 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setCreateSelected(it);
                        setCustomerName(it.name ?? "");
                        setCustomerPhone(it.phoneE164);
                        setCreateQuery(`${it.name ?? "未命名客户"} · ${it.phoneE164}`);
                        setCreateSuggestions([]);
                      }}
                      type="button"
                    >
                      <div className="text-sm font-medium text-neutral-900">{it.name ?? "未命名客户"}</div>
                      <div className="text-xs text-neutral-500">{it.phoneE164}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              {createSelected ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  已关联客户：{createSelected.name ?? "未命名客户"} · {createSelected.phoneE164}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input className="ui-input" onChange={(e) => setCustomerName(e.target.value)} placeholder="客户姓名" value={customerName} />
                <input className="ui-input" onChange={(e) => setCustomerPhone(e.target.value)} placeholder="客户电话 (必填)" value={customerPhone} />
                <input className="ui-input" onChange={(e) => setDeviceBrand(e.target.value)} placeholder="设备品牌 (必填)" value={deviceBrand} />
                <input className="ui-input" onChange={(e) => setDeviceModel(e.target.value)} placeholder="设备型号 (必填)" value={deviceModel} />
                <input className="ui-input md:col-span-2" onChange={(e) => setSerialOrImei(e.target.value)} placeholder="IMEI / 序列号 (可选)" value={serialOrImei} />
              </div>
              <select
                className="ui-input w-full"
                onChange={(e) => setCreateOrderType(e.target.value as "quick_repair" | "dropoff_repair")}
                value={createOrderType}
              >
                <option value="quick_repair">快速维修（当场修好）</option>
                <option value="dropoff_repair">留机维修（需诊断报价）</option>
              </select>
              <textarea
                className="ui-input min-h-[88px] w-full py-2"
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="问题描述 (必填)"
                value={issueDescription}
              />
              {createError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{createError}</div>
              ) : null}
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button className="ui-btn ui-btn-secondary h-10 px-3 md:h-9" onClick={() => { setCreateOpen(false); setCreateError(null); }} type="button">
                取消
              </button>
              <button
                className="ui-btn ui-btn-primary h-10 px-3 md:h-9 disabled:opacity-60"
                disabled={createPending}
                onClick={async () => {
                  setCreateError(null);
                  if (!customerPhone.trim()) { setCreateError("客户电话不能为空"); return; }
                  if (!deviceBrand.trim()) { setCreateError("设备品牌不能为空"); return; }
                  if (!deviceModel.trim()) { setCreateError("设备型号不能为空"); return; }
                  if (!issueDescription.trim()) { setCreateError("问题描述不能为空"); return; }
                  setCreatePending(true);
                  try {
                    const res = await fetch("/api/orders", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderType: createOrderType,
                        customerPhone: customerPhone.trim(),
                        customerName: customerName.trim() || undefined,
                        brand: deviceBrand.trim(),
                        model: deviceModel.trim(),
                        serialOrImei: serialOrImei.trim() || undefined,
                        issueDescription: issueDescription.trim(),
                      }),
                    });
                    const data = await res.json() as { id?: string; error?: string };
                    if (!res.ok) throw new Error(data.error ?? "创建失败");
                    setCreateOpen(false);
                    setCreateQuery("");
                    setCreateSelected(null);
                    setCustomerName("");
                    setCustomerPhone("");
                    setDeviceBrand("");
                    setDeviceModel("");
                    setSerialOrImei("");
                    setIssueDescription("");
                    setCreateOrderType("quick_repair");
                    setCreateError(null);
                    if (data.id) {
                      router.push(`/orders/${data.id}`);
                    } else {
                      router.refresh();
                    }
                  } catch (e) {
                    setCreateError(e instanceof Error ? e.message : "创建失败");
                  } finally {
                    setCreatePending(false);
                  }
                }}
                type="button"
              >
                {createPending ? "创建中..." : "创建工单"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChipToggle(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={[
        "ui-btn h-10 rounded-xl border px-3 text-sm font-medium md:h-9",
        props.active
          ? "border-amber-100 bg-amber-50 text-amber-700"
          : "border-border bg-muted text-neutral-700",
      ].join(" ")}
      onClick={props.onClick}
      type="button"
    >
      {props.label}
    </button>
  );
}
