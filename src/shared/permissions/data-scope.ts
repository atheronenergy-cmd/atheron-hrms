import type { DataScope } from "./engine";

export type DataScopeFilter = {
  scope: DataScope;
  userId: string;
  companyId: string | null;
  employeeId: string | null;
  branchIds: string[];
};

export type ScopeQueryFilter = Record<string, unknown>;

/**
 * Builds a Prisma-style where clause fragment based on data scope.
 * Future modules pass the result into repository queries.
 */
export function buildScopeFilter(filter: DataScopeFilter): ScopeQueryFilter {
  switch (filter.scope) {
    case "global":
      return {};
    case "company":
      return filter.companyId ? { companyId: filter.companyId } : { id: "__none__" };
    case "branch":
      return filter.branchIds.length > 0
        ? { branchId: { in: filter.branchIds } }
        : { id: "__none__" };
    case "team":
      return filter.employeeId
        ? { OR: [{ reportingManagerId: filter.employeeId }, { employeeId: filter.employeeId }] }
        : { id: "__none__" };
    case "self":
      return filter.employeeId ? { employeeId: filter.employeeId } : { userId: filter.userId };
    default:
      return { userId: filter.userId };
  }
}

export function filterByScope<T extends { companyId?: string | null; branchId?: string | null; employeeId?: string | null; userId?: string }>(
  items: T[],
  filter: DataScopeFilter,
): T[] {
  const where = buildScopeFilter(filter);
  if (Object.keys(where).length === 0) return items;

  return items.filter((item) => {
    if ("companyId" in where && where.companyId && item.companyId !== where.companyId) {
      return false;
    }
    if ("branchId" in where && where.branchId && typeof where.branchId === "object" && "in" in where.branchId) {
      const branchIds = where.branchId.in as string[];
      if (item.branchId && !branchIds.includes(item.branchId)) return false;
    }
    if ("employeeId" in where && where.employeeId && item.employeeId !== where.employeeId) {
      return false;
    }
    if ("userId" in where && where.userId && item.userId !== where.userId) {
      return false;
    }
    return true;
  });
}

export function describeScope(scope: DataScope): string {
  const descriptions: Record<DataScope, string> = {
    global: "All data across the platform",
    company: "All data within the company",
    branch: "Data within assigned branches",
    team: "Direct reports and own data",
    self: "Own data only",
  };
  return descriptions[scope];
}
