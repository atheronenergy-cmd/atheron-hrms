"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { isSelfServicePath, SELF_SERVICE_HOME } from "@/shared/constants/self-service";
import { usePermissions } from "@/shared/permissions/use-permission";

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const isEmployee = usePermissions().scope === "self";
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <Link href={isEmployee ? SELF_SERVICE_HOME : "/dashboard"} className="flex items-center hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const canLink = !isLast && (!isEmployee || isSelfServicePath(href));
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" />
            {isLast || !canLink ? (
              <span className={isLast ? "font-medium text-foreground" : undefined}>{formatSegment(segment)}</span>
            ) : (
              <Link href={href} className="hover:text-foreground">
                {formatSegment(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
