import type { AssignmentStatus } from "@shared/types";
import { cn } from "@/lib/utils";

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
};

/** Compact label for tight slots (board table). */
export const ASSIGNMENT_STATUS_SHORT: Record<AssignmentStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  CONFIRMED: "OK",
  REJECTED: "No",
  CANCELLED: "Off",
};

export function filledSlotSurfaceClass(status: AssignmentStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-violet-500/10 border-violet-500/35 text-violet-900 dark:text-violet-100";
    case "PENDING":
      return "bg-amber-500/10 border-amber-500/35 text-amber-900 dark:text-amber-100";
    case "CONFIRMED":
      return "bg-emerald-500/10 border-emerald-500/35 text-emerald-900 dark:text-emerald-100";
    case "REJECTED":
      return "bg-red-500/10 border-red-500/35 text-red-900 dark:text-red-100";
    case "CANCELLED":
      return "bg-muted/50 border-border text-muted-foreground";
    default:
      return "bg-blue-500/10 border-blue-500/30 text-foreground";
  }
}

export function assignmentStatusBadgeClass(status: AssignmentStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/30";
    case "PENDING":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30";
    case "CONFIRMED":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30";
    case "REJECTED":
      return "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30";
    case "CANCELLED":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function AssignmentStatusBadge({
  status,
  compact,
  className,
}: {
  status: AssignmentStatus;
  compact?: boolean;
  className?: string;
}) {
  const label = compact ? ASSIGNMENT_STATUS_SHORT[status] : ASSIGNMENT_STATUS_LABELS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1 py-0 text-[9px] font-semibold uppercase tracking-wide shrink-0",
        assignmentStatusBadgeClass(status),
        className
      )}
    >
      {label}
    </span>
  );
}
