export type RepairOrderStatus =
  | "rework"
  | "new"
  | "mail_in_progress"
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
  badgeTitle?: string;
  dotColor: string;
  textColor: string;
  rowBg: string;
};

const PRESENTATION: Record<RepairOrderStatus, StatusPresentation> = {
  rework: {
    label: "返修",
    dotColor: "bg-status-danger-foreground",
    textColor: "text-status-danger-foreground",
    rowBg: "bg-status-danger",
  },
  new: {
    label: "接单",
    dotColor: "bg-status-neutral-foreground",
    textColor: "text-status-neutral-foreground",
    rowBg: "bg-status-neutral",
  },
  mail_in_progress: {
    label: "寄修中",
    badgeTitle: "寄修运输/仓储中",
    dotColor: "bg-status-info-foreground",
    textColor: "text-status-info-foreground",
    rowBg: "bg-status-info",
  },
  diagnosing: {
    label: "检测中",
    dotColor: "bg-status-info-foreground",
    textColor: "text-status-info-foreground",
    rowBg: "bg-status-info",
  },
  quoted: {
    label: "报价",
    dotColor: "bg-status-progress-foreground",
    textColor: "text-status-progress-foreground",
    rowBg: "bg-status-progress",
  },
  waiting_approval: {
    label: "报价",
    badgeTitle: "待客户确认报价",
    dotColor: "bg-status-progress-foreground",
    textColor: "text-status-progress-foreground",
    rowBg: "bg-status-progress",
  },
  parts_ordered: {
    label: "等配件",
    dotColor: "bg-status-warn-foreground",
    textColor: "text-status-warn-foreground",
    rowBg: "bg-status-warn",
  },
  parts_arrived: {
    label: "到货已通知",
    badgeTitle: "配件已到店",
    dotColor: "bg-status-warn-foreground",
    textColor: "text-status-warn-foreground",
    rowBg: "bg-status-warn",
  },
  repairing: {
    label: "报价已确认",
    badgeTitle: "维修进行中",
    dotColor: "bg-primary",
    textColor: "text-primary",
    rowBg: "bg-status-progress",
  },
  repaired: {
    label: "修好未通知",
    dotColor: "bg-status-success-foreground",
    textColor: "text-status-success-foreground",
    rowBg: "bg-status-success",
  },
  notified: {
    label: "修好已通知",
    dotColor: "bg-status-success-foreground",
    textColor: "text-status-success-foreground",
    rowBg: "bg-status-success",
  },
  unfixed_pickup: {
    label: "未修待取件",
    dotColor: "bg-status-warn-foreground",
    textColor: "text-status-warn-foreground",
    rowBg: "bg-status-warn",
  },
  waiting_pickup: {
    label: "待取件（旧）",
    dotColor: "bg-status-success-foreground",
    textColor: "text-status-success-foreground",
    rowBg: "bg-status-success",
  },
  completed: {
    label: "已完成",
    dotColor: "bg-status-success-foreground",
    textColor: "text-status-success-foreground",
    rowBg: "bg-status-success",
  },
  cancelled: {
    label: "已取消",
    dotColor: "bg-muted-foreground",
    textColor: "text-muted-foreground",
    rowBg: "bg-muted",
  },
};

export type OrderStatusPresentation = StatusPresentation;

export function getOrderStatusPresentation(status: string): StatusPresentation {
  const fallback: StatusPresentation = {
    label: status,
    dotColor: "bg-muted-foreground",
    textColor: "text-muted-foreground",
    rowBg: "bg-muted",
  };
  return PRESENTATION[status as RepairOrderStatus] ?? fallback;
}
