"use client";

import Link from "next/link";
import { calcWarranty } from "@/lib/domain/warranty-calc";

type Props = {
  originalOrderId: string;
  originalPublicNo: string;
  originalCompletedAt: string | null;
  originalWarrantyText: string | null;
};

export function ReworkInfoBanner(props: Props) {
  const warranty = calcWarranty(props.originalCompletedAt, props.originalWarrantyText);

  return (
    <div className="order-detail-section order-detail-enter-d0 rounded-xl border border-status-danger bg-status-danger px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold text-status-danger-foreground">返修单</span>
        <span className="text-foreground">
          原单：
          <Link href={`/orders/${props.originalOrderId}`} className="font-medium text-primary hover:underline">
            {props.originalPublicNo}
          </Link>
        </span>
        {props.originalCompletedAt && (
          <span className="text-muted-foreground">
            完工：{formatDate(props.originalCompletedAt)}
          </span>
        )}
        {props.originalWarrantyText && (
          <span className="text-muted-foreground">
            保修期：{props.originalWarrantyText}
          </span>
        )}
        {warranty && (
          <span className="text-muted-foreground">
            到期：{formatDate(warranty.expiresAt.toISOString())}
          </span>
        )}
        {warranty && (
          <span className={warranty.isInWarranty ? "font-medium text-status-success-foreground" : "font-medium text-status-danger-foreground"}>
            {warranty.isInWarranty
              ? `保修剩余 ${warranty.remainingDays} 天`
              : `已过期 ${Math.abs(warranty.remainingDays)} 天`}
          </span>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
