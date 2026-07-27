"use client";

import { ShieldX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/shared/constants/app";

type AccessDeniedProps = {
  title?: string;
  message?: string;
  showBackButton?: boolean;
};

export function AccessDenied({
  title = "Access Denied",
  message = "You do not have permission to perform this action.",
  showBackButton = true,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-3">
        <ShieldX className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      {showBackButton && (
        <Button asChild variant="outline">
          <Link href={ROUTES.dashboard}>Back to Dashboard</Link>
        </Button>
      )}
    </div>
  );
}
