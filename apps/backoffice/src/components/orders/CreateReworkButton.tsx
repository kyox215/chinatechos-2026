"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  orderId: string;
  customerPhone: string;
  customerName: string | null;
  brand: string;
  model: string;
  serialOrImei: string | null;
  warrantyText: string | null;
};

export function CreateReworkButton(props: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleCreate() {
    if (!confirm("确认为此工单创建返修单？将自动关联原单并预填客户设备信息。")) return;
    setPending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: props.customerPhone,
          customerName: props.customerName,
          brand: props.brand,
          model: props.model,
          serialOrImei: props.serialOrImei,
          issueDescription: "",
          warrantyText: props.warrantyText,
          originalOrderId: props.orderId,
          initialStatus: "rework",
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "创建失败");
      router.push(`/orders/${data.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "创建返修单失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className="ui-btn h-9 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
      disabled={pending}
      onClick={handleCreate}
      type="button"
    >
      {pending ? "创建中..." : "创建返修单"}
    </button>
  );
}
