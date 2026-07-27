"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { PermissionButton } from "@/components/permissions/permission-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterBar, PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { RecordStatusBadge } from "@/modules/organization/components/record-status-badge";
import type { DesignationListItem, HolidayListItem, PolicyListItem, ScheduleListItem } from "@/modules/organization/domain/types";
import { HOLIDAY_TYPE_LABELS, HR_POLICY_CATEGORY_LABELS, ORG_ROUTES } from "@/modules/organization/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";
import type { PaginatedResult } from "@/shared/types";

export function DesignationTable({ data }: { data: PaginatedResult<DesignationListItem> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => router.push(`${ORG_ROUTES.designations}?${params.toString()}`));
    },
    [router, searchParams],
  );

  const columns = useMemo<ColumnDef<DesignationListItem>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Designation" },
      { accessorKey: "level", header: "Level" },
      { accessorKey: "departmentName", header: "Department", cell: ({ row }) => row.original.departmentName ?? "—" },
      { accessorKey: "employeeCount", header: "Employees" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <RecordStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={ORG_ROUTES.designationEdit(row.original.id)}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Designations"
        description="Job titles and hierarchy levels"
        actions={
          <PermissionButton permission={PERMISSIONS.DESIGNATION.PROFILE.CREATE} asChild>
            <Link href={ORG_ROUTES.designationNew}>Add Designation</Link>
          </PermissionButton>
        }
      />
      <FilterBar>
        <SearchBox placeholder="Search designations…" defaultValue={searchParams.get("search") ?? ""} onSearch={(v) => updateParams({ search: v || undefined, page: "1" })} />
      </FilterBar>
      <DataTable columns={columns} data={data.items} />
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={(p) => updateParams({ page: String(p) })} />
    </div>
  );
}

export function HolidayTable({ data }: { data: PaginatedResult<HolidayListItem> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => router.push(`${ORG_ROUTES.holidays}?${params.toString()}`));
    },
    [router, searchParams],
  );

  const columns = useMemo<ColumnDef<HolidayListItem>[]>(
    () => [
      { accessorKey: "name", header: "Holiday" },
      { accessorKey: "date", header: "Date", cell: ({ row }) => format(new Date(row.original.date), "dd MMM yyyy") },
      {
        accessorKey: "holidayType",
        header: "Type",
        cell: ({ row }) => <Badge variant="outline">{HOLIDAY_TYPE_LABELS[row.original.holidayType] ?? row.original.holidayType}</Badge>,
      },
      { accessorKey: "branchName", header: "Branch", cell: ({ row }) => row.original.branchName ?? "All" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <RecordStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={ORG_ROUTES.holidayEdit(row.original.id)}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Holiday Calendar"
        description="Public, restricted, and company holidays"
        actions={
          <PermissionButton permission={PERMISSIONS.HOLIDAY.CALENDAR.CREATE} asChild>
            <Link href={ORG_ROUTES.holidayNew}>Add Holiday</Link>
          </PermissionButton>
        }
      />
      <FilterBar>
        <SearchBox placeholder="Search holidays…" defaultValue={searchParams.get("search") ?? ""} onSearch={(v) => updateParams({ search: v || undefined, page: "1" })} />
      </FilterBar>
      <DataTable columns={columns} data={data.items} />
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={(p) => updateParams({ page: String(p) })} />
    </div>
  );
}

export function PolicyTable({ data }: { data: PaginatedResult<PolicyListItem> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => router.push(`${ORG_ROUTES.policies}?${params.toString()}`));
    },
    [router, searchParams],
  );

  const columns = useMemo<ColumnDef<PolicyListItem>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Policy" },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => HR_POLICY_CATEGORY_LABELS[row.original.category] ?? row.original.category,
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <RecordStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={ORG_ROUTES.policyEdit(row.original.id)}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="HR Policies"
        description="Attendance, leave, payroll, and overtime rules"
        actions={
          <PermissionButton permission={PERMISSIONS.HR.POLICY.MANAGE} asChild>
            <Link href={ORG_ROUTES.policyNew}>Add Policy</Link>
          </PermissionButton>
        }
      />
      <FilterBar>
        <SearchBox placeholder="Search policies…" defaultValue={searchParams.get("search") ?? ""} onSearch={(v) => updateParams({ search: v || undefined, page: "1" })} />
      </FilterBar>
      <DataTable columns={columns} data={data.items} />
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={(p) => updateParams({ page: String(p) })} />
    </div>
  );
}

export function ScheduleTable({ data }: { data: PaginatedResult<ScheduleListItem> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => router.push(`${ORG_ROUTES.schedules}?${params.toString()}`));
    },
    [router, searchParams],
  );

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const columns = useMemo<ColumnDef<ScheduleListItem>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Schedule" },
      {
        id: "hours",
        header: "Hours",
        cell: ({ row }) => `${row.original.startTime} – ${row.original.endTime}`,
      },
      {
        accessorKey: "workingDays",
        header: "Working Days",
        cell: ({ row }) => row.original.workingDays.map((d) => dayLabels[d]).join(", "),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <RecordStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={ORG_ROUTES.scheduleEdit(row.original.id)}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Working Schedules"
        description="Office hours, breaks, and weekly offs"
        actions={
          <PermissionButton permission={PERMISSIONS.SHIFT.SCHEDULE.CREATE} asChild>
            <Link href={ORG_ROUTES.scheduleNew}>Add Schedule</Link>
          </PermissionButton>
        }
      />
      <FilterBar>
        <SearchBox placeholder="Search schedules…" defaultValue={searchParams.get("search") ?? ""} onSearch={(v) => updateParams({ search: v || undefined, page: "1" })} />
      </FilterBar>
      <DataTable columns={columns} data={data.items} />
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={(p) => updateParams({ page: String(p) })} />
    </div>
  );
}
