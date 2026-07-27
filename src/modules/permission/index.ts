export { demoDeniedAction,demoProtectedAction } from "./actions/demo.actions";
export type { PermissionRepository } from "./infrastructure/repositories/prisma-permission.repository";
export { createPermissionRepository,PrismaPermissionRepository } from "./infrastructure/repositories/prisma-permission.repository";

export const MODULE_NAME = "permission";
