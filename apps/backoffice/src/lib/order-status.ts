export type RepairOrderStatus =
  | "new"
  | "diagnosing"
  | "waiting_approval"
  | "repairing"
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
    label: "新建",
    className: "border-neutral-200 bg-neutral-100 text-neutral-700",
  };
  return PRESENTATION[status as RepairOrderStatus] ?? fallback;
}
