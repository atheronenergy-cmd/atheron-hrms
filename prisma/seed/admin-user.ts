import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_EMAIL = "admin@atheron.app";
const DEFAULT_ADMIN_PASSWORD = "Admin@Atheron123";

export async function seedAdminUser(prisma: PrismaClient, companyId: string) {
  const email = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  const superAdminRole = await prisma.role.findFirst({
    where: { slug: "super_admin", companyId: null },
  });

  if (!superAdminRole) {
    throw new Error("Super Admin role not found. Seed roles first.");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "System Administrator",
      passwordHash,
      emailVerified: new Date(),
      status: "active",
      companyId,
    },
    create: {
      email,
      name: "System Administrator",
      passwordHash,
      emailVerified: new Date(),
      status: "active",
      companyId,
    },
  });

  const existingAssignment = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: superAdminRole.id },
  });

  if (!existingAssignment) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });
  }

  console.log(`Seeded admin user: ${email}`);
  console.log("Admin credentials use ADMIN_EMAIL / ADMIN_PASSWORD env vars when set.");
}
