"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreateOrderModal } from "@/components/orders/CreateOrderModal";
import { useMobileSidebar } from "@/components/MobileSidebarContext";

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
  const router = useRouter();
  const pathname = usePathname();
  const sidebar = useMobileSidebar();
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

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d: { items?: SupplierOption[] }) => setSupplierOptions(d.items ?? []))
      .catch(() => {});
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
    if (keyword.length < 2) return;
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

  function applyFilters(next: {
    q?: string; status?: string; technician?: string;
    paid?: string; supplier?: string; dateFrom?: string; dateTo?: string;
    approvalOverdue?: boolean; pickupOverdue?: boolean;
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
    const aOverdue = next.approvalOverdue ?? props.approvalOverdue;
    const pOverdue = next.pickupOverdue ?? props.pickupOverdue;
    if (aOverdue) params.set("approvalOverdue", "1");
    if (pOverdue) params.set("pickupOverdue", "1");
    const query = params.toString();
    router.push(query ? `/orders?${query}` : "/orders");
  }

  return (
    <>
      <div className="ui-panel flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {pathname === "/orders" && sidebar ? (
            <button
              aria-label="打开菜单"
              aria-expanded={sidebar.mobileSidebarOpen}
              className="ui-btn ui-btn-secondary h-10 w-10 shrink-0 text-lg text-neutral-700 md:hidden"
              onClick={sidebar.toggleMobileSidebar}
              type="button"
            >
              ☰
            </button>
          ) : null}
          <div className="relative flex-1">
            <input
              className="ui-input h-10 w-full pl-3 pr-3 md:h-9"
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 100)}
              onFocus={() => setSearchFocused(true)}
              placeholder="实时搜索：电话 / 客户名 / 工单号 / IMEI"
              value={q}
            />
            {searchFocused && q.trim().length >= 2 ? (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-surface p-2 shadow-sm">
                {loadingSuggest ? (
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
            <button className="ui-btn ui-btn-primary h-10 px-3 md:h-9" onClick={() => applyFilters({ q })} type="button">搜索</button>
            <button className="ui-btn ui-btn-secondary h-10 px-3 md:h-9" onClick={() => setAdvancedOpen((v) => !v)} type="button">
              高级筛选{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
            </button>
            <button className="ui-btn ui-btn-primary h-10 px-4 md:h-9" onClick={() => setCreateOpen(true)} type="button">新建工单</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ChipToggle active={props.approvalOverdue} label="待确认超时" onClick={() => applyFilters({ approvalOverdue: !props.approvalOverdue })} />
          <ChipToggle active={props.pickupOverdue} label="超期未取件" onClick={() => applyFilters({ pickupOverdue: !props.pickupOverdue })} />
          <Link className="ui-btn ui-btn-secondary h-10 px-3 leading-10 md:h-9 md:leading-9" href="/orders">清空全部</Link>
        </div>

        {advancedOpen ? (
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <select className="ui-input" onChange={(e) => setStatus(e.target.value)} value={status}>
                <option value="all">状态：全部</option>
                <option value="new">接单</option>
                <option value="diagnosing">检测中</option>
                <option value="quoted">已报价</option>
                <option value="waiting_approval">等回复</option>
                <option value="parts_ordered">等配件</option>
                <option value="parts_arrived">到货</option>
                <option value="repaired">修好</option>
                <option value="notified">已通知</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
              <select className="ui-input" onChange={(e) => setSupplier(e.target.value)} value={supplier}>
                <option value="all">供应商：全部</option>
                {supplierOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.short_name}</option>
                ))}
              </select>
              <select className="ui-input" onChange={(e) => setPaid(e.target.value)} value={paid}>
                <option value="all">结清：全部</option>
                <option value="yes">已结清</option>
                <option value="no">未结清</option>
              </select>
              <input className="ui-input" onChange={(e) => setTechnician(e.target.value)} placeholder="技师" value={technician} />
              <input className="ui-input" onChange={(e) => setDateFrom(e.target.value)} type="date" value={dateFrom} />
              <input className="ui-input" onChange={(e) => setDateTo(e.target.value)} type="date" value={dateTo} />
            </div>
            <div className="mt-3 flex gap-2">
              <button className="ui-btn ui-btn-primary h-10 px-3 md:h-9" onClick={() => applyFilters({ status, paid, supplier, technician, dateFrom, dateTo })} type="button">应用筛选</button>
              <button className="ui-btn ui-btn-secondary h-10 px-3 md:h-9" onClick={() => {
                setStatus("all"); setPaid("all"); setSupplier("all"); setTechnician(""); setDateFrom(""); setDateTo("");
                applyFilters({ status: "all", paid: "all", supplier: "all", technician: "", dateFrom: "", dateTo: "" });
              }} type="button">重置</button>
            </div>
          </div>
        ) : null}
      </div>

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

function ChipToggle(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={[
        "ui-btn h-10 rounded-xl border px-3 text-sm font-medium md:h-9",
        props.active ? "border-amber-100 bg-amber-50 text-amber-700" : "border-border bg-muted text-neutral-700",
      ].join(" ")}
      onClick={props.onClick}
      type="button"
    >
      {props.label}
    </button>
  );
}
