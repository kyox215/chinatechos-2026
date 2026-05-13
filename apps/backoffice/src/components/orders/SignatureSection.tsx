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
              alt="客户签名预览"
              className="h-10 rounded border border-border bg-surface object-contain px-2"
            />
            <button
              type="button"
              className="ui-btn ui-btn-secondary h-9 px-3 text-xs"
              onClick={() => setOpen(true)}
            >
              重新签名
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ui-btn ui-btn-primary h-9 px-4 text-xs"
            onClick={() => setOpen(true)}
          >
            ✍️ 客户签名
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
