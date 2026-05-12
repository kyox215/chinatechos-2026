"use client";

import { createContext, useContext, type ReactNode } from "react";

const OrdersListSearchDraftContext = createContext<string | null>(null);

export function OrdersListSearchDraftProvider({
  draftQ,
  children,
}: {
  draftQ: string;
  children: ReactNode;
}) {
  return (
    <OrdersListSearchDraftContext.Provider value={draftQ}>{children}</OrdersListSearchDraftContext.Provider>
  );
}

/** 顶栏搜索草稿（未写入 URL 前）；无 Provider 时为 null。 */
export function useOrdersListSearchDraft(): string | null {
  return useContext(OrdersListSearchDraftContext);
}
