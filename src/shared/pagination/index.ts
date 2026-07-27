import type { PaginatedMeta, PaginatedResult } from "@/shared/types";

export function getPaginationParams(page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  return { skip, take: pageSize };
}

export function buildPaginatedResult<T>(
  items: T[],
  totalItems: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const meta: PaginatedMeta = { page, pageSize, totalItems, totalPages };
  return { items, meta };
}

export function getPaginationRange(current: number, total: number, delta = 2): (number | "...")[] {
  const range: (number | "...")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("...");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("...");
  if (total > 1) range.push(total);

  return range;
}
