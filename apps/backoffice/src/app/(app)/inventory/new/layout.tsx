import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "新建入库 — ChinaTechOS",
  description: "创建新的库存商品记录",
};

export default function NewInventoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
