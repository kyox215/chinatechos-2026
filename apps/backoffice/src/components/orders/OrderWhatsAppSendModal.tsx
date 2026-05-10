"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeWhatsAppPhone } from "@/lib/domain/whatsapp";

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  title?: string;
  messageText: string;
  initialPhones: string[];
  operatorName?: string;
};

function uniquePhones(phones: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const phone of phones) {
    const p = phone.trim();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    result.push(p);
  }
  return result;
}

function isPhoneValid(phone: string): boolean {
  const cleaned = normalizeWhatsAppPhone(phone);
  return cleaned.length >= 8 && cleaned.length <= 15;
}

export function OrderWhatsAppSendModal(props: Props) {
  const router = useRouter();
  const initialList = useMemo(() => uniquePhones(props.initialPhones), [props.initialPhones]);
  const [phones, setPhones] = useState<string[]>(initialList);
  const [selectedPhone, setSelectedPhone] = useState(initialList[0] ?? "");
  const [newPhone, setNewPhone] = useState("");
  const [saveToOrder, setSaveToOrder] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!props.open) return null;

  async function handleAddPhone() {
    try {
      const candidate = newPhone.trim();
      if (!candidate) return;
      if (!isPhoneValid(candidate)) {
        setError("号码格式无效，请输入包含国家码的号码");
        return;
      }
      setError(null);
      const nextPhones = uniquePhones([...phones, candidate]);
      setPhones(nextPhones);
      setSelectedPhone(candidate);
      setNewPhone("");

      if (!saveToOrder) return;
      const res = await fetch(`/api/orders/${props.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPhones: nextPhones,
          operatorName: props.operatorName ?? "frontdesk",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "保存订单号码失败");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加号码失败");
    }
  }

  async function handleSend() {
    if (pending) return;
    if (!selectedPhone.trim()) {
      setError("请先选择一个发送号码");
      return;
    }
    if (!isPhoneValid(selectedPhone)) {
      setError("发送号码格式无效");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}/messages/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customBody: props.messageText,
          overridePhone: selectedPhone.trim(),
          operatorName: props.operatorName ?? "frontdesk",
        }),
      });
      const data = (await res.json()) as { waLink?: string; messageLogId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "创建消息失败");
      if (!data.waLink) throw new Error("未生成 WhatsApp 链接");

      window.open(data.waLink, "_blank");
      if (data.messageLogId) {
        await fetch(`/api/message-logs/${data.messageLogId}/opened`, { method: "POST" });
      }
      props.onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="flex max-h-[80dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-lg md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground font-display">{props.title ?? "发送 WhatsApp 给客户"}</h3>
          <button
            className="ui-btn ui-btn-secondary flex h-8 w-8 items-center justify-center text-xs"
            onClick={props.onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <div className="text-xs text-muted-foreground">以下消息将通过 WhatsApp 发送：</div>
          <div className="whitespace-pre-line rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-foreground">
            {props.messageText}
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="text-xs font-medium text-foreground">发送号码</div>
            <select
              className="ui-input h-9 w-full text-xs"
              onChange={(e) => setSelectedPhone(e.target.value)}
              value={selectedPhone}
            >
              {phones.length === 0 ? (
                <option value="">暂无号码</option>
              ) : (
                phones.map((phone) => (
                  <option key={phone} value={phone}>
                    {phone}
                  </option>
                ))
              )}
            </select>

            <div className="flex gap-2">
              <input
                className="ui-input h-9 flex-1 text-xs"
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="输入备用号码（如 +393331234567）"
                value={newPhone}
              />
              <button className="ui-btn ui-btn-secondary h-9 px-3 text-xs" onClick={handleAddPhone} type="button">
                添加并使用
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                checked={saveToOrder}
                className="h-4 w-4 rounded border-border"
                onChange={(e) => setSaveToOrder(e.target.checked)}
                type="checkbox"
              />
              保存到当前工单号码列表
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div>{error && <span className="text-xs text-status-danger-foreground">{error}</span>}</div>
          <div className="flex gap-2">
            <button className="ui-btn ui-btn-secondary h-9 px-3 text-xs" onClick={props.onClose} type="button">
              取消
            </button>
            <button
              className="ui-btn ui-btn-primary h-9 px-4 text-xs disabled:opacity-60"
              disabled={pending}
              onClick={handleSend}
              type="button"
            >
              {pending ? "处理中..." : "打开 WhatsApp 发送"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
