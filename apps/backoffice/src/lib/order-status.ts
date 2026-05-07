export type RepairOrderStatus =
  | "rework"
  | "new"
  | "diagnosing"
  | "quoted"
  | "waiting_approval"
  | "parts_ordered"
  | "parts_arrived"
  | "repairing"
  | "repaired"
  | "notified"
  | "unfixed_pickup"
  | "waiting_pickup"
  | "completed"
  | "cancelled";

type StatusPresentation = {
  label: string;
  /** 鼠标悬停补充说明（主文案仍用 label） */
  badgeTitle?: string;
  dotColor: string;
  textColor: string;
  rowBg: string;
};

const PRESENTATION: Record<RepairOrderStatus, StatusPresentation> = {
  rework: {
    label: "返修",
    dotColor: "bg-rose-500",
    textColor: "text-rose-700",
    rowBg: "bg-rose-50",
  },
  new: {
    label: "接单",
    dotColor: "bg-neutral-400",
    textColor: "text-neutral-700",
    rowBg: "bg-neutral-50",
  },
  diagnosing: {
    label: "检测中",
    dotColor: "bg-sky-500",
    textColor: "text-sky-700",
    rowBg: "bg-sky-50",
  },
  quoted: {
    label: "报价",
    dotColor: "bg-violet-500",
    textColor: "text-violet-700",
    rowBg: "bg-violet-50",
  },
  waiting_approval: {
    label: "报价",
    badgeTitle: "待客户确认报价",
    dotColor: "bg-violet-500",
    textColor: "text-violet-700",
    rowBg: "bg-violet-50",
  },
  parts_ordered: {
    label: "等配件",
    dotColor: "bg-orange-500",
    textColor: "text-orange-700",
    rowBg: "bg-orange-50",
  },
  parts_arrived: {
    label: "到货已通知",
    badgeTitle: "配件已到店",
    dotColor: "bg-orange-600",
    textColor: "text-orange-800",
    rowBg: "bg-orange-50",
  },
  repairing: {
    label: "报价已确认",
    badgeTitle: "维修进行中",
    dotColor: "bg-indigo-500",
    textColor: "text-indigo-700",
    rowBg: "bg-indigo-50",
  },
  repaired: {
    label: "修好未通知",
    dotColor: "bg-teal-500",
    textColor: "text-teal-700",
    rowBg: "bg-teal-50",
  },
  notified: {
    label: "修好已通知",
    dotColor: "bg-cyan-500",
    textColor: "text-cyan-700",
    rowBg: "bg-cyan-50",
  },
  unfixed_pickup: {
    label: "未修待取件",
    dotColor: "bg-amber-600",
    textColor: "text-amber-900",
    rowBg: "bg-amber-50",
  },
  waiting_pickup: {
    label: "待取件（旧）",
    dotColor: "bg-emerald-400",
    textColor: "text-emerald-600",
    rowBg: "bg-emerald-50",
  },
  completed: {
    label: "已完成",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-700",
    rowBg: "bg-emerald-50",
  },
  cancelled: {
    label: "已取消",
    dotColor: "bg-neutral-300",
    textColor: "text-neutral-500",
    rowBg: "bg-neutral-50",
  },
};

export type OrderStatusPresentation = StatusPresentation;

export function getOrderStatusPresentation(status: string): StatusPresentation {
  const fallback: StatusPresentation = {
    label: status,
    dotColor: "bg-neutral-400",
    textColor: "text-neutral-700",
    rowBg: "bg-neutral-50",
  };
  return PRESENTATION[status as RepairOrderStatus] ?? fallback;
}
