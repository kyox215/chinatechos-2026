import type { Metadata } from "next";
import { NewCustomerForm } from "./NewCustomerForm";

export const metadata: Metadata = {
  title: "新建客户 — ChinaTechOS",
  description: "创建新客户记录",
};

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      <NewCustomerForm />
    </div>
  );
}
