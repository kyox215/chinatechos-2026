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
  | "waiting_pickup"
  | "completed"
  | "cancelled";

type StatusPresentation = {
  label: string;
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
    label: "已报价",
    dotColor: "bg-violet-500",
    textColor: "text-violet-700",
    rowBg: "bg-violet-50",
  },
  waiting_approval: {
    label: "等回复",
    dotColor: "bg-amber-500",
    textColor: "text-amber-700",
    rowBg: "bg-amber-50",
  },
  parts_ordered: {
    label: "等配件",
    dotColor: "bg-orange-500",
    textColor: "text-orange-700",
    rowBg: "bg-orange-50",
  },
  parts_arrived: {
    label: "到货",
    dotColor: "bg-orange-600",
    textColor: "text-orange-800",
    rowBg: "bg-orange-50",
  },
  repairing: {
    label: "维修中(旧)",
    dotColor: "bg-indigo-400",
    textColor: "text-indigo-600",
    rowBg: "bg-indigo-50",
  },
  repaired: {
    label: "修好",
    dotColor: "bg-teal-500",
    textColor: "text-teal-700",
    rowBg: "bg-teal-50",
  },
  notified: {
    label: "已通知",
    dotColor: "bg-cyan-500",
    textColor: "text-cyan-700",
    rowBg: "bg-cyan-50",
  },
  waiting_pickup: {
    label: "待取件(旧)",
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

export function getOrderStatusPresentation(status: string): StatusPresentation {
  const fallback: StatusPresentation = {
    label: status,
    dotColor: "bg-neutral-400",
    textColor: "text-neutral-700",
    rowBg: "bg-neutral-50",
  };
  return PRESENTATION[status as RepairOrderStatus] ?? fallback;
}
