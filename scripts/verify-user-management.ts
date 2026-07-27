/**
 * User Management module verification.
 * Run: npx tsx scripts/verify-user-management.ts
 */
import { usersToCsv } from "../src/modules/user/application/export.service";
import { USER_STATUS_LABELS } from "../src/modules/user/domain/types";
import {
  acceptInvitationSchema,
  createUserSchema,
  roleAssignmentSchema,
  updateUserSchema,
  userListQuerySchema,
} from "../src/modules/user/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== User Management Verification ===\n");

assert(Object.keys(USER_STATUS_LABELS).length === 5, "Five user statuses supported");
assert(PERMISSIONS.USER.ACCOUNT.READ === "user.account.read", "Read permission defined");
assert(PERMISSIONS.USER.ROLE.ASSIGN === "user.role.assign", "Role assign permission defined");

const validCreate = createUserSchema.safeParse({
  name: "Subha Admin",
  email: "subha@atheron.app",
  phone: "+919876543210",
  roleIds: ["00000000-0000-4000-8000-000000000001"],
  sendInvitation: true,
});
assert(validCreate.success, "CreateUserSchema accepts valid input");

const invalidCreate = createUserSchema.safeParse({
  name: "",
  email: "bad",
  roleIds: [],
  sendInvitation: true,
});
assert(!invalidCreate.success, "CreateUserSchema rejects invalid input");

const validUpdate = updateUserSchema.safeParse({
  id: "00000000-0000-4000-8000-000000000002",
  name: "Updated Name",
  email: "updated@atheron.app",
  version: 1,
});
assert(validUpdate.success, "UpdateUserSchema accepts valid input");

const validRole = roleAssignmentSchema.safeParse({
  userId: "00000000-0000-4000-8000-000000000002",
  roleId: "00000000-0000-4000-8000-000000000001",
});
assert(validRole.success, "RoleAssignmentSchema accepts valid input");

const query = userListQuerySchema.parse({ page: "1", search: "subha" });
assert(query.page === 1 && query.search === "subha", "UserListQuerySchema parses search params");

const weakPassword = acceptInvitationSchema.safeParse({
  token: "abc",
  password: "short",
  confirmPassword: "short",
});
assert(!weakPassword.success, "AcceptInvitationSchema enforces password rules");

const csv = usersToCsv([
  {
    id: "1",
    name: "Subha",
    email: "subha@atheron.app",
    phone: null,
    status: "active",
    avatarFileId: null,
    lastLoginAt: null,
    createdAt: new Date(),
    roles: [{ id: "r1", name: "Super Admin", slug: "super_admin" }],
  },
]);
assert(csv.includes("Subha") && csv.includes("Super Admin"), "CSV export generates valid output");

console.log("\n=== All user management checks passed ===\n");
