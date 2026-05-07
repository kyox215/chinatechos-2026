"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { ResolvedOrderUi, ResolvedOrderUiJson } from "@/lib/domain/order-ui-config";
import { resolvedOrderUiFromJson } from "@/lib/domain/order-ui-config";

const OrderUiContext = createContext<ResolvedOrderUiJson | null>(null);

export function OrderUiProvider(props: { value: ResolvedOrderUiJson; children: ReactNode }) {
  return (
    <OrderUiContext.Provider value={props.value}>{props.children}</OrderUiContext.Provider>
  );
}

/** 列表 / 筛选 / 徽标等必须挂在 Provider 内（由 `(app)/layout` 注入） */
export function useOrderUi(): ResolvedOrderUiJson {
  const v = useContext(OrderUiContext);
  if (!v) {
    throw new Error("OrderUiProvider 缺失：请在 (app)/layout 中包裹工单展示配置");
  }
  return v;
}

/** 用于可选场景（如测试）；默认不应依赖 fallback */
export function useOrderUiOptional(): ResolvedOrderUiJson | null {
  return useContext(OrderUiContext);
}

export function useResolvedOrderUi(): ResolvedOrderUi {
  return resolvedOrderUiFromJson(useOrderUi());
}
