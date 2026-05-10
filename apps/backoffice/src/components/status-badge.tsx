import { cn } from "@/lib/utils";

type StatusVariant = "neutral" | "info" | "progress" | "warn" | "success" | "danger";

const variantClasses: Record<StatusVariant, string> = {
  neutral: "bg-status-neutral text-status-neutral-foreground",
  info: "bg-status-info text-status-info-foreground",
  progress: "bg-status-progress text-status-progress-foreground",
  warn: "bg-status-warn text-status-warn-foreground",
  success: "bg-status-success text-status-success-foreground",
  danger: "bg-status-danger text-status-danger-foreground",
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
