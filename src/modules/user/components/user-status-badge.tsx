import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { USER_STATUS_LABELS } from "@/modules/user/domain/types";

const statusVariants: Record<string, "success" | "secondary" | "destructive" | "warning" | "outline"> = {
  active: "success",
  inactive: "secondary",
  locked: "destructive",
  suspended: "warning",
  pending_verification: "outline",
};

type UserStatusBadgeProps = {
  status: string;
  className?: string;
};

export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const label = USER_STATUS_LABELS[status] ?? status;
  const variant = statusVariants[status] ?? "secondary";

  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {label}
    </Badge>
  );
}
