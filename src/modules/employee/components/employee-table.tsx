"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Download, MoreHorizontal, Pencil, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { PermissionButton } from "@/components/permissions/permission-button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deactivateEmployeeAction,
  exportEmployeesAction,
} from "@/modules/employee/actions/employee.actions";
import { EmployeeStatusBadge } from "@/modules/employee/components/employee-status-badge";
import {
  EMPLOYEE_ROUTES,
  EMPLOYEE_STATUS_LABELS,
  type EmployeeListItem,
} from "@/modules/employee/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";
import type { PaginatedResult } from "@/shared/types";

type FilterOption = { id: string; name: string };

type EmployeeTableProps = {
  data: PaginatedResult<EmployeeListItem>;
  branches: FilterOption[];
  departments: FilterOption[];
};

export function EmployeeTable({ data, branches, departments }: EmployeeTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => router.push(`${EMPLOYEE_ROUTES.list}?${params.toString()}`));
    },
    [router, searchParams],
  );

  const handleExport = () => {
    startTransition(async () => {
      const r = await exportEmployeesAction({ format: "csv" });
      if (r.success && r.data) {
        const blob = new Blob([r.data.content], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = r.data.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(r.message);
      } else toast.error(r.message);
    });
  };

  const columns = useMemo<ColumnDef<EmployeeListItem>[]>(
    () => [
      { accessorKey: "employeeCode", header: "Employee ID" },
      {
        accessorKey: "fullName",
        header: "Name",
        cell: ({ row }) => (
          <Link href={EMPLOYEE_ROUTES.detail(row.original.id)} className="font-medium hover:underline">
            {row.original.fullName}
          </Link>
        ),
      },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "departmentName", header: "Department" },
      { accessorKey: "designationName", header: "Designation" },
      { accessorKey: "branchName", header: "Branch" },
      {
        accessorKey: "employmentStatus",
        header: "Status",
        cell: ({ row }) => <EmployeeStatusBadge status={row.original.employmentStatus} />,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={EMPLOYEE_ROUTES.edit(row.original.id)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              {row.original.status === "active" && (
                <DropdownMenuItem
                  onClick={() => {
                    startTransition(async () => {
                      const r = await deactivateEmployeeAction(row.original.id, row.original.version);
                      if (r.success) {
                        toast.success(r.message);
                        router.refresh();
                      } else toast.error(r.message);
                    });
                  }}
                >
                  <UserX className="mr-2 h-4 w-4" /> Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employee Registry"
        description="Search, filter, and manage workforce records"
        actions={
          <div className="flex gap-2">
            <PermissionButton permission={PERMISSIONS.EMPLOYEE.PROFILE.EXPORT} variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export
            </PermissionButton>
            <PermissionButton permission={PERMISSIONS.EMPLOYEE.PROFILE.CREATE} asChild>
              <Link href={EMPLOYEE_ROUTES.new}>Add Employee</Link>
            </PermissionButton>
          </div>
        }
      />
      <FilterBar>
        <SearchBox
          placeholder="Search by ID, name, email, phone…"
          defaultValue={searchParams.get("search") ?? ""}
          onSearch={(v) => updateParams({ search: v || undefined, page: "1" })}
        />
        <Select
          value={searchParams.get("branchId") ?? "all"}
          onValueChange={(v) => updateParams({ branchId: v === "all" ? undefined : v, page: "1" })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("departmentId") ?? "all"}
          onValueChange={(v) => updateParams({ departmentId: v === "all" ? undefined : v, page: "1" })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("employmentStatus") ?? "all"}
          onValueChange={(v) => updateParams({ employmentStatus: v === "all" ? undefined : v, page: "1" })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>
      <DataTable
        columns={columns}
        data={data.items}
        enableSelection
        getRowId={(row) => row.id}
        onSelectionChange={setSelectedIds}
      />
      {selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">{selectedIds.length} selected — bulk actions ready</p>
      )}
      <Pagination
        page={data.meta.page}
        totalPages={data.meta.totalPages}
        onPageChange={(page) => updateParams({ page: String(page) })}
      />
    </div>
  );
}
