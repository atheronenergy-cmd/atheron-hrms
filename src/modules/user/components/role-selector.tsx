"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type RoleOption = { id: string; name: string; slug: string };

type RoleSelectorProps = {
  roles: RoleOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
};

export function RoleSelector({ roles, selectedIds, onChange, className }: RoleSelectorProps) {
  function toggle(roleId: string, checked: boolean) {
    onChange(checked ? [...selectedIds, roleId] : selectedIds.filter((id) => id !== roleId));
  }

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {roles.map((role) => (
        <label
          key={role.id}
          className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
        >
          <Checkbox
            checked={selectedIds.includes(role.id)}
            onCheckedChange={(v) => toggle(role.id, v === true)}
          />
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{role.name}</span>
            <p className="text-xs text-muted-foreground">{role.slug}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
