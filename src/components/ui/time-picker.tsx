import * as React from "react";

import { cn } from "@/lib/utils";

import { Input } from "./input";
import { Label } from "./label";

export function TimePicker({
  label,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { label?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Input type="time" {...props} />
    </div>
  );
}
