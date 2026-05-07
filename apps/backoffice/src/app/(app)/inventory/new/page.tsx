"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewInventoryPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productChannel, setProductChannel] = useState("new_retail");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [imeiOrSerial, setImeiOrSerial] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productChannel,
          brand,
          model,
          imeiOrSerial,
          sellerPhone: productChannel === "trade_in" ? sellerPhone : undefined,
          sellerName: productChannel === "trade_in" ? sellerName : undefined,
          purchaseCost: purchaseCost.trim() ? Number(purchaseCost.replace(",", ".")) : undefined,
          listPrice: listPrice.trim() ? Number(listPrice.replace(",", ".")) : undefined,
          notes,
        }),
      });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(data.error || "创建失败");
      if (data.id) router.push(`/inventory/${data.id}`);
      else router.push("/inventory");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <Link className="text-sm text-neutral-500 hover:text-neutral-800" href="/inventory">
          ← 返回列表
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">新建入库</h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</div>
      ) : null}

      <form className="space-y-4 rounded-2xl border border-border bg-surface p-3 md:p-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-0.5 block text-[11px] text-neutral-400">渠道</label>
          <select
            className="ui-input h-10 w-full md:h-9"
            onChange={(e) => setProductChannel(e.target.value)}
            value={productChannel}
          >
            <option value="new_retail">新机</option>
            <option value="refurbished">翻新</option>
            <option value="trade_in">回收</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-0.5 block text-[11px] text-neutral-400">品牌</label>
            <input
              className="ui-input h-10 w-full md:h-9"
              onChange={(e) => setBrand(e.target.value)}
              required
              value={brand}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] text-neutral-400">型号</label>
            <input
              className="ui-input h-10 w-full md:h-9"
              onChange={(e) => setModel(e.target.value)}
              required
              value={model}
            />
          </div>
        </div>

        <div>
          <label className="mb-0.5 block text-[11px] text-neutral-400">IMEI / 序列号（可选）</label>
          <input
            className="ui-input h-10 w-full md:h-9"
            onChange={(e) => setImeiOrSerial(e.target.value)}
            value={imeiOrSerial}
          />
        </div>

        {productChannel === "trade_in" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-[11px] text-neutral-400">卖方电话</label>
              <input
                className="ui-input h-10 w-full md:h-9"
                onChange={(e) => setSellerPhone(e.target.value)}
                required
                value={sellerPhone}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] text-neutral-400">卖方姓名（可选）</label>
              <input
                className="ui-input h-10 w-full md:h-9"
                onChange={(e) => setSellerName(e.target.value)}
                value={sellerName}
              />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-0.5 block text-[11px] text-neutral-400">成本 EUR（可选）</label>
            <input
              className="ui-input h-10 w-full md:h-9"
              inputMode="decimal"
              onChange={(e) => setPurchaseCost(e.target.value)}
              value={purchaseCost}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] text-neutral-400">标价 EUR（可选）</label>
            <input
              className="ui-input h-10 w-full md:h-9"
              inputMode="decimal"
              onChange={(e) => setListPrice(e.target.value)}
              value={listPrice}
            />
          </div>
        </div>

        <div>
          <label className="mb-0.5 block text-[11px] text-neutral-400">备注</label>
          <textarea
            className="ui-input min-h-[88px] w-full md:min-h-[72px]"
            onChange={(e) => setNotes(e.target.value)}
            value={notes}
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Link className="ui-btn ui-btn-secondary order-2 h-10 px-4 text-center text-xs sm:order-1 md:h-9" href="/inventory">
            取消
          </Link>
          <button
            className="ui-btn ui-btn-primary order-1 h-10 px-4 text-xs sm:order-2 md:h-9"
            disabled={busy}
            type="submit"
          >
            {busy ? "提交中…" : "提交入库"}
          </button>
        </div>
      </form>
    </div>
  );
}
