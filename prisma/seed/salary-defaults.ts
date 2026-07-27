import { PrismaClient } from "@prisma/client";

import { DEFAULT_PAY_GRADES, DEFAULT_SALARY_STRUCTURES } from "../../src/modules/payroll/domain/types";

export async function seedSalaryDefaults(prisma: PrismaClient, companyId: string, actorUserId?: string) {
  let grades = 0;
  let structures = 0;

  for (const g of DEFAULT_PAY_GRADES) {
    const exists = await prisma.payGrade.findFirst({ where: { companyId, code: g.code } });
    if (exists) continue;
    await prisma.payGrade.create({
      data: { companyId, name: g.name, code: g.code, level: g.level, createdBy: actorUserId, updatedBy: actorUserId },
    });
    grades += 1;
  }

  for (const s of DEFAULT_SALARY_STRUCTURES) {
    const exists = await prisma.salaryStructure.findFirst({ where: { companyId, code: s.code } });
    if (exists) continue;
    await prisma.salaryStructure.create({
      data: { companyId, name: s.name, code: s.code, createdBy: actorUserId, updatedBy: actorUserId },
    });
    structures += 1;
  }

  console.log(`Seeded ${grades} pay grades and ${structures} salary structures.`);
}
