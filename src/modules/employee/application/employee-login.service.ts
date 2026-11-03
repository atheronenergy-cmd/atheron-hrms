import { prisma } from "@/infrastructure/database/prisma-client";
import { isEmailConfigured } from "@/infrastructure/email/email-provider";
import { invitationService } from "@/modules/user/application/invitation.service";
import { ConflictError, NotFoundError } from "@/shared/errors";

export type EmployeeLoginResult = {
  userId: string;
  email: string;
  created: boolean;
  invited: boolean;
};

export async function ensureEmployeeLogin(
  companyId: string,
  employeeId: string,
  actorUserId: string,
): Promise<EmployeeLoginResult> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, deletedAt: null },
  });
  if (!employee) throw new NotFoundError("Employee", employeeId);

  const email = employee.email.toLowerCase();
  if (employee.userId) {
    const linked = await prisma.user.findFirst({
      where: { id: employee.userId, deletedAt: null },
      select: { id: true, email: true },
    });
    if (linked) return { userId: linked.id, email: linked.email, created: false, invited: false };
  }

  let user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  let created = false;

  if (user) {
    if (user.companyId && user.companyId !== companyId) {
      throw new ConflictError("This email already belongs to a login in another company.");
    }
    const otherEmployee = await prisma.employee.findFirst({
      where: { userId: user.id, deletedAt: null, NOT: { id: employee.id } },
    });
    if (otherEmployee) {
      throw new ConflictError("This email is already linked to another employee.");
    }
    if (!user.companyId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { companyId } });
    }
  } else {
    user = await prisma.user.create({
      data: {
        companyId,
        email,
        name: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
        phone: employee.phone,
        status: "pending_verification",
        createdBy: actorUserId,
      },
    });
    created = true;
  }

  const role =
    (await prisma.role.findFirst({ where: { slug: "employee", companyId, deletedAt: null } })) ??
    (await prisma.role.findFirst({ where: { slug: "employee", companyId: null, deletedAt: null } }));
  if (role) {
    const assigned = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id } });
    if (!assigned) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id, assignedBy: actorUserId },
      });
    }
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: { userId: user.id, updatedBy: actorUserId },
  });

  let invited = false;
  if (created && (isEmailConfigured() || process.env.NODE_ENV !== "production")) {
    await invitationService.sendInvitation(user.id, actorUserId);
    invited = true;
  }

  return { userId: user.id, email: user.email, created, invited };
}
