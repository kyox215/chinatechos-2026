"use client";

import { useState } from "react";
import { SignatureModal } from "@/components/orders/SignatureModal";

type Props = {
  orderId: string;
  customerSignature: string | null;
};

export function SignatureSection({ orderId, customerSignature }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        {customerSignature ? (
          <div className="flex items-center gap-3">
            <img
              src={customerSignature}
              alt="Firma cliente"
              className="h-10 rounded border border-border bg-white object-contain px-2"
            />
            <button
              type="button"
              className="ui-btn ui-btn-secondary h-9 px-3 text-xs"
              onClick={() => setOpen(true)}
            >
              Rifirma
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ui-btn ui-btn-primary h-9 px-4 text-xs"
            onClick={() => setOpen(true)}
          >
            Firma cliente
          </button>
        )}
      </div>
      <SignatureModal
        open={open}
        onClose={() => setOpen(false)}
        orderId={orderId}
        initialSignature={customerSignature}
      />
    </>
  );
}
