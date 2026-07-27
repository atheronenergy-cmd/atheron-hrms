/**
 * RBAC engine verification script.
 * Run: npx tsx scripts/verify-rbac.ts
 */
import { buildScopeFilter,filterByScope } from "../src/shared/permissions/data-scope";
import { ALL_PERMISSION_KEYS, PERMISSIONS } from "../src/shared/permissions/definitions";
import {
  type AuthorizationContext,
  canAccess,
  checkPermission,
  hasPermission,
  hasRole,
  resolveEffectiveScope,
} from "../src/shared/permissions/engine";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

const superAdminContext: AuthorizationContext = {
  userId: "admin-id",
  companyId: "company-1",
  permissions: new Set(ALL_PERMISSION_KEYS),
  roles: new Set(["super_admin"]),
  scope: "global",
  branchIds: [],
  employeeId: null,
};

const employeeContext: AuthorizationContext = {
  userId: "emp-id",
  companyId: "company-1",
  permissions: new Set([
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.EMPLOYEE.PROFILE.READ,
    PERMISSIONS.LEAVE.REQUEST.CREATE,
    PERMISSIONS.PAYROLL.PAYSLIP.READ,
  ]),
  roles: new Set(["employee"]),
  scope: "self",
  branchIds: [],
  employeeId: "employee-1",
};

console.log("\n=== RBAC Engine Verification ===\n");

assert(ALL_PERMISSION_KEYS.length >= 100, `Permission catalog has ${ALL_PERMISSION_KEYS.length} keys`);
assert(hasPermission(superAdminContext, PERMISSIONS.EMPLOYEE.PROFILE.CREATE), "Super admin can create employees");
assert(!hasPermission(employeeContext, PERMISSIONS.EMPLOYEE.PROFILE.CREATE), "Employee cannot create employees");
assert(hasPermission(employeeContext, PERMISSIONS.LEAVE.REQUEST.CREATE), "Employee can apply leave");
assert(hasRole(employeeContext, "employee"), "Employee has employee role");
assert(!hasRole(employeeContext, "super_admin"), "Employee is not super admin");
assert(canAccess(superAdminContext, "payroll.payrun.approve"), "Super admin can approve payroll");
assert(!checkPermission(employeeContext, "employee.profile.delete").allowed, "Employee delete denied");

const scope = resolveEffectiveScope(["self", "company"]);
assert(scope === "company", "Effective scope resolves to broadest");

const scopeFilter = buildScopeFilter({
  scope: "self",
  userId: "u1",
  companyId: "c1",
  employeeId: "e1",
  branchIds: [],
});
assert(scopeFilter.employeeId === "e1", "Self scope filters by employeeId");

const filtered = filterByScope(
  [
    { employeeId: "e1", companyId: "c1" },
    { employeeId: "e2", companyId: "c1" },
  ],
  { scope: "self", userId: "u1", companyId: "c1", employeeId: "e1", branchIds: [] },
);
assert(filtered.length === 1, "filterByScope returns own records only");

console.log("\n=== All RBAC checks passed ===\n");
