"use client";

import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserPermissionSummary } from "@/modules/user/domain/types";

type PermissionListProps = {
  summary: UserPermissionSummary;
  className?: string;
};

export function PermissionList({ summary, className }: PermissionListProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {summary.totalGranted} of {summary.totalAvailable} permissions granted
        </span>
      </div>

      {summary.modules.map(({ module, permissions }) => {
        const granted = permissions.filter((p) => p.granted);
        if (granted.length === 0) return null;

        return (
          <div key={module} className="space-y-3">
            <h4 className="text-sm font-semibold capitalize">{module.replace(/_/g, " ")}</h4>
            <div className="rounded-lg border divide-y">
              {permissions.map((perm) => (
                <div
                  key={perm.key}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {perm.granted ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className={cn(!perm.granted && "text-muted-foreground")}>
                      {perm.action.charAt(0).toUpperCase() + perm.action.slice(1)}{" "}
                      <span className="text-muted-foreground">({perm.resource})</span>
                    </span>
                  </div>
                  {perm.granted && perm.sourceRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {perm.sourceRoles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs font-normal">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
