import { SupplierManager } from "@/components/settings/SupplierManager";

export default function SuppliersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">供应商管理</h1>
        <div className="mt-1 text-sm text-neutral-600">管理配件供应商列表，用于工单配件来源追踪。</div>
      </div>
      <SupplierManager />
    </div>
  );
}
