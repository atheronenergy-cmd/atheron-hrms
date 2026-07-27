"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Search commands, employees, pages..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Navigation">
              <Command.Item className="rounded-md px-2 py-1.5 text-sm">Dashboard</Command.Item>
              <Command.Item className="rounded-md px-2 py-1.5 text-sm">Employees</Command.Item>
              <Command.Item className="rounded-md px-2 py-1.5 text-sm">Payroll</Command.Item>
            </Command.Group>
            <Command.Group heading="Actions">
              <Command.Item className="rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                Commands will be available after module integration
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
