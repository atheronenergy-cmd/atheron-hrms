import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RoleBadgeProps = {
  name: string;
  slug?: string;
  className?: string;
};

export function RoleBadge({ name, className }: RoleBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-normal", className)}>
      {name}
    </Badge>
  );
}
