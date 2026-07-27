"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
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
import { deactivateBranchAction } from "@/modules/organization/actions/organization.actions";
import { RecordStatusBadge } from "@/modules/organization/components/record-status-badge";
import type { BranchListItem } from "@/modules/organization/domain/types";
import { ORG_ROUTES } from "@/modules/organization/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";
import type { PaginatedResult } from "@/shared/types";

type BranchTableProps = { data: PaginatedResult<BranchListItem> };

export function BranchTable({ data }: BranchTableProps) {
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
      startTransition(() => router.push(`${ORG_ROUTES.branches}?${params.toString()}`));
    },
    [router, searchParams],
  );

  const columns = useMemo<ColumnDef<BranchListItem>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Branch Name" },
      { accessorKey: "city", header: "City", cell: ({ row }) => row.original.city ?? "—" },
      { accessorKey: "managerName", header: "Manager", cell: ({ row }) => row.original.managerName ?? "—" },
      { accessorKey: "employeeCount", header: "Employees" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <RecordStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={ORG_ROUTES.branchEdit(row.original.id)}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
              </DropdownMenuItem>
              {row.original.status === "active" && (
                <DropdownMenuItem
                  onClick={() => {
                    startTransition(async () => {
                      const r = await deactivateBranchAction(row.original.id, row.original.version);
                      if (r.success) { toast.success(r.message); router.refresh(); }
                      else toast.error(r.message);
                    });
                  }}
                >
                  Deactivate
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
        title="Branches"
        description="Manage office locations and geofences"
        actions={
          <PermissionButton permission={PERMISSIONS.BRANCH.PROFILE.CREATE} asChild>
            <Link href={ORG_ROUTES.branchNew}>Add Branch</Link>
          </PermissionButton>
        }
      />
      <FilterBar>
        <SearchBox
          placeholder="Search branches…"
          defaultValue={searchParams.get("search") ?? ""}
          onSearch={(v) => updateParams({ search: v || undefined, page: "1" })}
        />
      </FilterBar>
      <DataTable columns={columns} data={data.items} />
      <Pagination
        page={data.meta.page}
        totalPages={data.meta.totalPages}
        onPageChange={(page) => updateParams({ page: String(page) })}
      />
    </div>
  );
}
