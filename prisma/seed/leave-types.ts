import { PrismaClient } from "@prisma/client";

import { DEFAULT_LEAVE_TYPES } from "../../src/modules/leave/domain/types";

export async function seedLeaveTypes(prisma: PrismaClient, companyId: string, actorUserId?: string) {
  let created = 0;
  for (const t of DEFAULT_LEAVE_TYPES) {
    const existing = await prisma.leaveType.findFirst({ where: { companyId, code: t.code } });
    if (existing) continue;
    await prisma.leaveType.create({
      data: {
        companyId,
        name: t.name,
        code: t.code,
        isPaid: t.isPaid ?? true,
        isCarryForward: "isCarryForward" in t ? Boolean(t.isCarryForward) : false,
        accrualRate: "accrualRate" in t ? Number(t.accrualRate) : 0,
        genderRestriction: "genderRestriction" in t ? (t.genderRestriction as never) : undefined,
        maxDaysPerRequest: "maxDaysPerRequest" in t ? Number(t.maxDaysPerRequest) : undefined,
        halfDayAllowed: "halfDayAllowed" in t ? Boolean(t.halfDayAllowed) : true,
        requiresAttachment: "requiresAttachment" in t ? Boolean(t.requiresAttachment) : false,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} default leave types.`);
}
