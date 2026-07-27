"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format,formatDistanceToNow } from "date-fns";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
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
  DropdownMenuSeparator,
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
import { deleteUserAction } from "@/modules/user/actions/user.actions";
import { RoleBadge } from "@/modules/user/components/role-badge";
import { UserAvatar } from "@/modules/user/components/user-avatar";
import { UserStatusBadge } from "@/modules/user/components/user-status-badge";
import type { UserListItem } from "@/modules/user/domain/types";
import { USER_ROUTES, USER_STATUS_LABELS } from "@/modules/user/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";
import type { PaginatedResult } from "@/shared/types";

type RoleOption = { id: string; name: string; slug: string };

type UserTableProps = {
  data: PaginatedResult<UserListItem>;
  roles: RoleOption[];
};

export function UserTable({ data, roles }: UserTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => {
        router.push(`${USER_ROUTES.list}?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const columns = useMemo<ColumnDef<UserListItem>[]>(
    () => [
      {
        id: "photo",
        header: "",
        cell: ({ row }) => <UserAvatar name={row.original.name} size="sm" />,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={USER_ROUTES.detail(row.original.id)}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      { accessorKey: "email", header: "Email" },
      {
        id: "roles",
        header: "Roles",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {row.original.roles.slice(0, 2).map((r) => (
              <RoleBadge key={r.id} name={r.name} />
            ))}
            {row.original.roles.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{row.original.roles.length - 2}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "lastLoginAt",
        header: "Last login",
        cell: ({ row }) =>
          row.original.lastLoginAt
            ? formatDistanceToNow(row.original.lastLoginAt, { addSuffix: true })
            : "Never",
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => format(row.original.createdAt, "dd MMM yyyy"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={USER_ROUTES.detail(row.original.id)}>
                  <Eye className="mr-2 h-4 w-4" /> View profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={USER_ROUTES.edit(row.original.id)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  if (!confirm("Delete this user account?")) return;
                  const result = await deleteUserAction(row.original.id);
                  if (result.success) {
                    toast.success(result.message);
                    router.refresh();
                  } else {
                    toast.error(result.message);
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
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
        title="Users"
        description="Manage system users, roles, and access."
        actions={
          <PermissionButton permission={PERMISSIONS.USER.ACCOUNT.CREATE} asChild>
            <Link href={USER_ROUTES.create}>Create user</Link>
          </PermissionButton>
        }
      />

      <FilterBar>
        <SearchBox
          placeholder="Search name or email…"
          className="w-full sm:w-72"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ search: (e.target as HTMLInputElement).value, page: "1" });
            }
          }}
          onSearch={(v) => setSearch(v)}
        />
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(v) => updateParams({ status: v === "all" ? undefined : v, page: "1" })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("roleId") ?? "all"}
          onValueChange={(v) => updateParams({ roleId: v === "all" ? undefined : v, page: "1" })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => updateParams({ search, page: "1" })}
        >
          Apply
        </Button>
        {selectedIds.length > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {selectedIds.length} selected
          </span>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        data={data.items}
        enableSelection
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(row) => row.id}
      />

      <Pagination
        page={data.meta.page}
        totalPages={data.meta.totalPages}
        onPageChange={(page) => updateParams({ page: String(page) })}
      />
    </div>
  );
}
