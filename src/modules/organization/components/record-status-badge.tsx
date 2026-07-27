import { Badge } from "@/components/ui/badge";
import { RECORD_STATUS_LABELS } from "@/modules/organization/domain/types";

const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
  trial: "outline",
};

export function RecordStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={variants[status] ?? "secondary"}>
      {RECORD_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
