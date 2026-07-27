import { PrismaClient } from "@prisma/client";

import { seedAdminUser } from "./admin-user";
import { seedLeaveTypes } from "./leave-types";
import { seedSalaryDefaults } from "./salary-defaults";
import { seedStatutoryDefaults } from "./statutory-defaults";
import { SYSTEM_PERMISSIONS } from "./permissions";
import { SYSTEM_ROLES } from "./roles";

const prisma = new PrismaClient();

async function seedPermissions() {
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
      create: {
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        key: perm.key,
        description: perm.description,
      },
    });
  }
  console.log(`Seeded ${SYSTEM_PERMISSIONS.length} permissions.`);
}

async function seedCompany() {
  const company = await prisma.company.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Company",
      slug: "default",
      countryCode: "IN",
      currencyCode: "INR",
      timezone: "Asia/Kolkata",
      fiscalYearStartMonth: 4,
      status: "active",
      settings: { enabledModules: [] },
    },
  });
  console.log(`Seeded default company: ${company.name} (${company.id})`);
  return company;
}

async function seedRoles(companyId: string) {
  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.key, p.id]));

  for (const roleDef of SYSTEM_ROLES) {
    const roleCompanyId = roleDef.scope === "global" ? null : companyId;

    const existing = await prisma.role.findFirst({
      where: { slug: roleDef.slug, companyId: roleCompanyId },
    });

    const role = existing
      ? await prisma.role.update({
          where: { id: existing.id },
          data: {
            name: roleDef.name,
            description: roleDef.description,
            isSystem: roleDef.isSystem,
            scope: roleDef.scope,
          },
        })
      : await prisma.role.create({
          data: {
            companyId: roleCompanyId,
            name: roleDef.name,
            slug: roleDef.slug,
            description: roleDef.description,
            isSystem: roleDef.isSystem,
            scope: roleDef.scope,
            status: "active",
          },
        });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const keys =
      roleDef.permissionKeys === "*"
        ? allPermissions.map((p) => p.key)
        : roleDef.permissionKeys;

    for (const key of keys) {
      const permissionId = permissionMap.get(key);
      if (permissionId) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId },
        });
      }
    }

    console.log(`Seeded role: ${role.name} with ${keys.length} permissions.`);
  }
}

async function seedSchemaVersion() {
  await prisma.schemaVersion.upsert({
    where: { version: "2.0.0-enterprise" },
    update: {},
    create: { version: "2.0.0-enterprise" },
  });
}

async function main() {
  console.log("Starting Atheron HRMS database seed...");
  await seedSchemaVersion();
  await seedPermissions();
  const company = await seedCompany();
  await seedRoles(company.id);
  await seedAdminUser(prisma, company.id);
  await seedLeaveTypes(prisma, company.id);
  await seedSalaryDefaults(prisma, company.id);
  await seedStatutoryDefaults(prisma, company.id);
  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
