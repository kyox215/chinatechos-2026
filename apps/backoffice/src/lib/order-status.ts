export type RepairOrderStatus =
  | "new"
  | "parts_ordered"
  | "parts_arrived"
  | "diagnosing"
  | "waiting_approval"
  | "repairing"
  | "repaired"
  | "notified"
  | "waiting_pickup"
  | "completed"
  | "cancelled";

type StatusPresentation = {
  label: string;
  className: string;
};

const PRESENTATION: Record<RepairOrderStatus, StatusPresentation> = {
  new: {
    label: "新建",
    className: "border-neutral-200 bg-neutral-100 text-neutral-700",
  },
  parts_ordered: {
    label: "配件已下单",
    className: "border-orange-100 bg-orange-50 text-orange-700",
  },
  parts_arrived: {
    label: "配件到货",
    className: "border-orange-200 bg-orange-100 text-orange-800",
  },
  diagnosing: {
    label: "检测中",
    className: "border-sky-100 bg-sky-50 text-sky-700",
  },
  waiting_approval: {
    label: "待客户确认报价",
    className: "border-amber-100 bg-amber-50 text-amber-700",
  },
  repairing: {
    label: "维修中",
    className: "border-indigo-100 bg-indigo-50 text-indigo-700",
  },
  repaired: {
    label: "修好待通知",
    className: "border-teal-100 bg-teal-50 text-teal-700",
  },
  notified: {
    label: "已通知待取件",
    className: "border-cyan-100 bg-cyan-50 text-cyan-700",
  },
  waiting_pickup: {
    label: "待取件 / 待付款",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  completed: {
    label: "已完成",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  cancelled: {
    label: "已取消",
    className: "border-rose-100 bg-rose-50 text-rose-700",
  },
};

export function getOrderStatusPresentation(status: string): StatusPresentation {
  const fallback: StatusPresentation = {
    label: status,
    className: "border-neutral-200 bg-neutral-100 text-neutral-700",
  };
  return PRESENTATION[status as RepairOrderStatus] ?? fallback;
}
