/**
 * Permission seed data — sourced from canonical definitions.
 * @see src/shared/permissions/definitions.ts
 */
import { SYSTEM_PERMISSION_DEFINITIONS } from "../../src/shared/permissions/definitions";

export const SYSTEM_PERMISSIONS = SYSTEM_PERMISSION_DEFINITIONS.map(
  ({ module, resource, action, key, description }) => ({
    module,
    resource,
    action,
    key,
    description,
  }),
);

export type SystemPermissionKey = (typeof SYSTEM_PERMISSIONS)[number]["key"];
