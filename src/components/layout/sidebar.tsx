"use client";

import {
  BarChart3,
  Building,
  Building2,
  CalendarDays,
  Clock,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Shield,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/shared/constants/app";
import { hasAnyPermission, hasPermission } from "@/shared/permissions/engine";
import { usePermissions } from "@/shared/permissions/use-permission";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserCog,
  Clock,
  CalendarDays,
  Wallet,
  Building2,
  Building,
  BarChart3,
  Settings,
  Shield,
};

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const authContext = usePermissions();

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.permission) return hasPermission(authContext, item.permission);
        if (item.permissions) return hasAnyPermission(authContext, item.permissions);
        return true;
      }),
    [authContext],
  );

  return (
    <aside className={cn("flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar", className)}>
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            A
          </div>
          <span>Atheron HRMS</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon] ?? LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-muted-foreground">Atheron HRMS v0.1.0</p>
      </div>
    </aside>
  );
}
