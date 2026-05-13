import type { Metadata } from "next";
import { SupplierManager } from "@/components/settings/SupplierManager";

export const metadata: Metadata = {
  title: "供应商管理 — ChinaTechOS",
  description: "管理配件供应商列表，用于工单配件来源追踪",
};

export default function SuppliersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">供应商管理</h1>
        <div className="mt-1 text-sm text-muted-foreground">管理配件供应商列表，用于工单配件来源追踪。</div>
      </div>
      <SupplierManager />
    </div>
  );
}
