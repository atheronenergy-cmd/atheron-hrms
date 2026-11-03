/** Pages an employee login is allowed to open. */
export const SELF_SERVICE_HOME = "/dashboard/attendance/me";

const SELF_SERVICE_PREFIXES = [
  "/dashboard/attendance/me",
  "/dashboard/leave/my",
  "/dashboard/leave/apply",
] as const;

export function isSelfServicePath(pathname: string): boolean {
  return SELF_SERVICE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
