import type { UserListItem } from "@/modules/user/domain/types";

export function usersToCsv(users: UserListItem[]): string {
  const headers = ["Name", "Email", "Phone", "Status", "Roles", "Last Login", "Created At"];
  const rows = users.map((u) =>
    [
      escapeCsv(u.name),
      escapeCsv(u.email),
      escapeCsv(u.phone ?? ""),
      escapeCsv(u.status),
      escapeCsv(u.roles.map((r) => r.name).join("; ")),
      escapeCsv(u.lastLoginAt?.toISOString() ?? ""),
      escapeCsv(u.createdAt.toISOString()),
    ].join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Placeholder hooks for Excel/PDF export in future modules. */
export const exportFormats = ["csv", "excel", "pdf"] as const;
