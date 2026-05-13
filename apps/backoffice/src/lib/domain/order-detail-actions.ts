/**
 * 工单详情页头部辅助：类型徽标、下一步待办提示等纯函数。
 * 仅做文案/样式映射，不依赖运行时数据；可在 Server / Client Component 直接复用。
 */

export type OrderTypeKey = "quick_repair" | "dropoff_repair" | "rework";

type OrderTypeBadgeMeta = {
  label: string;
  /** Italiano label for print/customer-facing UI. */
  labelIt: string;
  /** Tailwind classes following the design system tokens. */
  className: string;
};

/** 与 [`项目规划需求及进度/工单详情页交互状态稿清单（status×类型）.md`] 同源。 */
const ORDER_TYPE_BADGES: Record<OrderTypeKey, OrderTypeBadgeMeta> = {
  quick_repair: {
    label: "快速维修",
    labelIt: "Riparazione veloce",
    /** cyan 与状态「修好已通知」色系同源，且在主色摘要底上比 sky 更易辨认 */
    className: "border border-cyan-200 bg-cyan-50 text-cyan-800",
  },
  dropoff_repair: {
    label: "留机维修",
    labelIt: "Riparazione con consegna",
    className: "border border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  rework: {
    label: "返修",
    labelIt: "Rilavorazione",
    className: "border border-rose-200 bg-rose-50 text-rose-700",
  },
};

export function getOrderTypeBadge(orderType: string): OrderTypeBadgeMeta | null {
  return ORDER_TYPE_BADGES[orderType as OrderTypeKey] ?? null;
}

/**
 * 「下一步待办」文案：与状态枚举同源，状态机已覆盖即返回；
 * 终态 / 不需要待办的状态返回 null。
 */
const TODO_MESSAGES: Record<string, string> = {
  rework: "确认返修问题并安排检测",
  new: "开始检测或安排技师",
  mail_in_progress: "等待寄修包裹到店",
  diagnosing: "完成检测并录入报价",
  quoted: "向客户发送报价",
  waiting_approval: "等客户回复报价（建议 48h 内跟进）",
  repairing: "维修中，预计完工后通知客户",
  parts_ordered: "等配件到货",
  parts_arrived: "通知客户配件到店并开始维修",
  repaired: "通知客户取件",
  notified: "等客户上门取件 / 结清",
  unfixed_pickup: "等客户取回未修设备",
  waiting_pickup: "等客户取件 / 结清",
};

export function getOrderTodoMessage(status: string): string | null {
  return TODO_MESSAGES[status] ?? null;
}
