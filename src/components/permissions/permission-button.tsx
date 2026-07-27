"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { useCan } from "@/shared/permissions/use-permission";

type PermissionButtonProps = ComponentProps<typeof Button> & {
  permission: string;
  hideWhenDenied?: boolean;
};

export function PermissionButton({
  permission,
  hideWhenDenied = true,
  disabled,
  children,
  ...props
}: PermissionButtonProps) {
  const allowed = useCan(permission);

  if (!allowed && hideWhenDenied) return null;

  return (
    <Button {...props} disabled={disabled || !allowed} aria-disabled={!allowed || disabled}>
      {children}
    </Button>
  );
}
