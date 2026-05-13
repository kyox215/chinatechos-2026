"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useResolvedOrderUi } from "@/components/order-ui/OrderUiProvider";
import { CreateOrderModal } from "@/components/orders/CreateOrderModal";
import { getOrderStatusSelectOptionsResolved } from "@/lib/domain/order-ui-config";

type Suggestion = {
  id: string;
  name: string | null;
  phoneE164: string;
  lastOrderAt: string | null;
};

type SupplierOption = {
  id: string;
  short_name: string;
  color: string;
};

type Props = {
  q?: string;
  status: string;
  orderType?: string;
  technician: string;
  paid: string;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
  approvalOverdue: boolean;
  pickupOverdue: boolean;
};

export function OrdersSearchControls(props: Props) {
  const orderUi = useResolvedOrderUi();
  const router = useRouter();
  const [q, setQ] = useState(props.q ?? "");
  const [status, setStatus] = useState(props.status);
  const [technician, setTechnician] = useState(props.technician === "all" ? "" : props.technician);
  const [paid, setPaid] = useState(props.paid);
  const [supplier, setSupplier] = useState(props.supplier ?? "all");
  const [dateFrom, setDateFrom] = useState(props.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(props.dateTo ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);

  // Keep local fields in sync when URL changes (浏览器前进/后退、分享链接).
  /* eslint-disable react-hooks/set-state-in-effect -- controlled sync from server props */
  useEffect(() => {
    setQ(props.q ?? "");
    setStatus(props.status);
    setTechnician(props.technician === "all" ? "" : props.technician);
    setPaid(props.paid);
    setSupplier(props.supplier ?? "all");
    setDateFrom(props.dateFrom ?? "");
    setDateTo(props.dateTo ?? "");
  }, [
    props.q,
    props.status,
    props.technician,
    props.paid,
    props.supplier,
    props.dateFrom,
    props.dateTo,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    fetch("/api/suppliers")
      .then(async (r) => {
        if (!r.ok) return;
        const d = (await r.json()) as { items?: SupplierOption[] };
        setSupplierOptions(d.items ?? []);
      })
      .catch(() => setSupplierOptions([]));
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (status !== "all") count += 1;
    if (paid !== "all") count += 1;
    if (supplier !== "all") count += 1;
    if (technician.trim()) count += 1;
    if (dateFrom) count += 1;
    if (dateTo) count += 1;
    return count;
  }, [status, paid, supplier, technician, dateFrom, dateTo]);

  useEffect(() => {
    const keyword = q.trim();
    if (keyword.length < 2) {
      queueMicrotask(() => setSuggestions([]));
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const response = await fetch(`/api/customers/suggest?q=${encodeURIComponent(keyword)}&limit=10`);
        if (!response.ok) {
          setSuggestions([]);
          return;
        }
        const json = (await response.json()) as { items?: Suggestion[] };
        setSuggestions(json.items ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggest(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [q]);

  function applyFilters(next: {
    q?: string;
    status?: string;
    technician?: string;
    paid?: string;
    supplier?: string;
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
    const paidValue = next.paid ?? paid;
    if (paidValue !== "all") params.set("paid", paidValue);
    const supplierValue = next.supplier ?? supplier;
    if (supplierValue !== "all") params.set("supplier", supplierValue);
    const technicianValue = (next.technician ?? technician).trim();
    if (technicianValue) params.set("technician", technicianValue);
    const dateFromValue = next.dateFrom ?? dateFrom;
    if (dateFromValue) params.set("dateFrom", dateFromValue);
    const dateToValue = next.dateTo ?? dateTo;
    if (dateToValue) params.set("dateTo", dateToValue);
    const aOverdue = next.approvalOverdue !== undefined ? next.approvalOverdue : props.approvalOverdue;
    const pOverdue = next.pickupOverdue !== undefined ? next.pickupOverdue : props.pickupOverdue;
    /** 指定「状态」筛选时不再附带风险参数（与 listOrders 逻辑一致，避免 URL 误导） */
    const riskAllowed = statusValue === "all";
    if (riskAllowed) {
      if (aOverdue) params.set("approvalOverdue", "1");
      if (pOverdue) params.set("pickupOverdue", "1");
    }
    const query = params.toString();
    router.push(query ? `/orders?${query}` : "/orders");
  }

  const compactInput = "ui-input h-9 w-full rounded-lg text-sm";
  const compactBtn = "ui-btn h-8 shrink-0 rounded-lg px-2.5 text-xs font-semibold";

  return (
    <>
      <div className="ui-panel flex flex-col gap-2 md:gap-3 !p-2.5 md:!p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <input
              className={`${compactInput} max-md:text-[13px]`}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 100)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFilters({ q });
                }
              }}
              placeholder="实时搜索：电话 / 客户名 / 工单号 / IMEI"
              value={q}
            />
            {searchFocused && q.trim().length >= 2 ? (
              <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface p-1.5 shadow-sm">
                {loadingSuggest ? (
                  <div className="px-2 py-2 text-xs text-neutral-500">搜索中...</div>
                ) : suggestions.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-neutral-500">无匹配客户，继续输入可按关键词查工单</div>
                ) : (
                  suggestions.map((it) => (
                    <button
                      key={it.id}
                      className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
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
          <div className="flex flex-wrap gap-1.5">
            <button className={`${compactBtn} ui-btn-primary`} onClick={() => applyFilters({ q })} type="button">
              搜索
            </button>
            <button className={`${compactBtn} ui-btn-secondary`} onClick={() => setAdvancedOpen((v) => !v)} type="button">
              高级筛选{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
            </button>
            <button className={`${compactBtn} ui-btn-primary`} onClick={() => setCreateOpen(true)} type="button">
              新建工单
            </button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/70 pt-2 md:pt-2.5">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-medium text-neutral-400">风险</div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={props.approvalOverdue}
                  label="待确认超时"
                  variant="risk"
                  onClick={() => {
                    const on = !props.approvalOverdue;
                    applyFilters({
                      approvalOverdue: on,
                      pickupOverdue: on ? false : props.pickupOverdue,
                      ...(on ? { status: "all" } : {}),
                    });
                  }}
                />
                <FilterChip
                  active={props.pickupOverdue}
                  label="超期未取件"
                  variant="risk"
                  onClick={() => {
                    const on = !props.pickupOverdue;
                    applyFilters({
                      pickupOverdue: on,
                      approvalOverdue: on ? false : props.approvalOverdue,
                      ...(on ? { status: "all" } : {}),
                    });
                  }}
                />
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-medium text-neutral-400">账款</div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={props.paid === "no"}
                  label="未结清"
                  variant="accent"
                  onClick={() => applyFilters({ paid: props.paid === "no" ? "all" : "no" })}
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[11px] font-medium text-neutral-400">状态捷径</div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={props.status === "waiting_approval"}
                  label="等回复"
                  variant="accent"
                  onClick={() =>
                    applyFilters({
                      status: props.status === "waiting_approval" ? "all" : "waiting_approval",
                      approvalOverdue: false,
                      pickupOverdue: false,
                    })
                  }
                />
                <FilterChip
                  active={props.status === "parts_ordered"}
                  label="等配件"
                  variant="accent"
                  onClick={() =>
                    applyFilters({
                      status: props.status === "parts_ordered" ? "all" : "parts_ordered",
                      approvalOverdue: false,
                      pickupOverdue: false,
                    })
                  }
                />
              </div>
            </div>
            <Link
              className="ml-auto text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
              href="/orders"
            >
              清空筛选
            </Link>
          </div>
        </div>

        {advancedOpen ? (
          <div className="rounded-lg border border-border bg-surface-2 p-2.5 md:p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <select className={compactInput} onChange={(e) => setStatus(e.target.value)} value={status}>
                <option value="all">状态：全部</option>
                {getOrderStatusSelectOptionsResolved(orderUi).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select className={compactInput} onChange={(e) => setPaid(e.target.value)} value={paid}>
                <option value="all">结清：全部</option>
                <option value="yes">已结清</option>
                <option value="no">未结清</option>
              </select>
              <select className={compactInput} onChange={(e) => setSupplier(e.target.value)} value={supplier}>
                <option value="all">供应商：全部</option>
                {supplierOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.short_name}
                  </option>
                ))}
              </select>
              <input className={compactInput} onChange={(e) => setTechnician(e.target.value)} placeholder="技师" value={technician} />
              <input className={compactInput} onChange={(e) => setDateFrom(e.target.value)} type="date" value={dateFrom} />
              <input className={compactInput} onChange={(e) => setDateTo(e.target.value)} type="date" value={dateTo} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                className={`${compactBtn} ui-btn-primary`}
                onClick={() => applyFilters({ status, paid, supplier, technician, dateFrom, dateTo })}
                type="button"
              >
                应用筛选
              </button>
              <button
                className={`${compactBtn} ui-btn-secondary`}
                onClick={() => {
                  setStatus("all");
                  setPaid("all");
                  setSupplier("all");
                  setTechnician("");
                  setDateFrom("");
                  setDateTo("");
                  applyFilters({
                    status: "all",
                    paid: "all",
                    supplier: "all",
                    technician: "",
                    dateFrom: "",
                    dateTo: "",
                    approvalOverdue: false,
                    pickupOverdue: false,
                  });
                }}
                type="button"
              >
                重置
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function FilterChip(props: {
  label: string;
  active: boolean;
  variant: "risk" | "accent";
  onClick: () => void;
}) {
  const activeRisk = "border-amber-200 bg-amber-50 text-amber-800";
  const activeAccent = "border-primary/40 bg-primary-2 text-primary";
  const inactive = "border-border bg-muted/80 text-neutral-700 hover:bg-muted";
  const activeCls = props.variant === "risk" ? activeRisk : activeAccent;
  return (
    <button
      className={[
        "inline-flex h-8 max-w-full shrink-0 items-center rounded-full border px-3 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        props.active ? activeCls : inactive,
      ].join(" ")}
      onClick={props.onClick}
      type="button"
    >
      {props.label}
    </button>
  );
}
