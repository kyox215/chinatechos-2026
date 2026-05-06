"use client";

import { useState } from "react";
import { OrderEditModal } from "@/components/orders/OrderEditModal";

type Props = {
  orderId: string;
  issueDescription: string;
  diagnosisResult: string | null;
  technicianName: string | null;
  quotationAmount: number | null;
  depositAmount: number | null;
  internalTag: string | null;
  warrantyText: string | null;
  pauseReason: string | null;
};

export function OrderEditButton(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="text-xs font-medium text-indigo-600 hover:underline"
        onClick={() => setOpen(true)}
        type="button"
      >
        编辑维修信息
      </button>
      <OrderEditModal
        open={open}
        onClose={() => setOpen(false)}
        {...props}
      />
    </>
  );
}
