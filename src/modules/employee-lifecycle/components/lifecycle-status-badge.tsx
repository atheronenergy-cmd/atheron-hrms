import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "secondary",
  submitted: "secondary",
  under_review: "secondary",
  pending: "secondary",
  in_progress: "secondary",
  approved: "default",
  completed: "default",
  verified: "default",
  active: "default",
  rejected: "destructive",
  failed: "destructive",
  cancelled: "outline",
  extended: "outline",
};

export function LifecycleStatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? "outline"}>{status.replace(/_/g, " ")}</Badge>;
}
