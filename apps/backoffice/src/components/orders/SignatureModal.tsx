"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad } from "@/components/orders/SignaturePad";

type Props = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  initialSignature?: string | null;
};

export function SignatureModal({ open, onClose, orderId, initialSignature }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave(dataUrl: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerSignature: dataUrl }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Salvataggio firma fallito");
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/75 p-0 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-lg md:max-w-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground font-display">客户签名</h3>
          <button
            className="ui-btn ui-btn-secondary flex h-8 w-8 items-center justify-center text-xs"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Il cliente firma qui per confermare la ricezione del dispositivo.
          </p>
          <SignaturePad
            onSave={handleSave}
            initialValue={initialSignature}
            height={200}
          />
          {error && <p className="mt-2 text-xs text-status-danger-foreground">{error}</p>}
          {pending && <p className="mt-2 text-xs text-muted-foreground">Salvataggio in corso...</p>}
        </div>
      </div>
    </div>
  );
}
