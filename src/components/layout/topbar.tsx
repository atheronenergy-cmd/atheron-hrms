"use client";

import { Bell, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/ui/search-box";
import { cn } from "@/lib/utils";

import { ThemeSwitcher } from "./theme-switcher";
import { UserMenu } from "./user-menu";

export function Topbar({
  onMenuClick,
  className,
}: {
  onMenuClick?: () => void;
  className?: string;
}) {
  return (
    <header className={cn("flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6", className)}>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="hidden flex-1 md:block md:max-w-sm">
        <SearchBox placeholder="Search..." />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          <span className="sr-only">Notifications</span>
        </Button>

        <ThemeSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
