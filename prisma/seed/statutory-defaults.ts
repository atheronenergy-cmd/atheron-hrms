import type { PrismaClient } from "@prisma/client";

/**
 * Seeds default Indian statutory configuration for FY 2026-27.
 * All rates are stored in DB — calculators read configuration only.
 */
export async function seedStatutoryDefaults(prisma: PrismaClient, companyId: string) {
  const fy = await prisma.financialYear.upsert({
    where: { companyId_code: { companyId, code: "FY2026-27" } },
    update: { isCurrent: true },
    create: {
      companyId,
      code: "FY2026-27",
      label: "Financial Year 2026-27",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isCurrent: true,
      status: "active",
    },
  });

  await prisma.financialYear.updateMany({
    where: { companyId, id: { not: fy.id } },
    data: { isCurrent: false },
  });

  const rules = [
    { ruleType: "pf" as const, code: "PF", name: "Provident Fund" },
    { ruleType: "esi" as const, code: "ESI", name: "Employee State Insurance" },
    { ruleType: "professional_tax" as const, code: "PT_MH", name: "Professional Tax Maharashtra" },
    { ruleType: "income_tax" as const, code: "IT_NEW", name: "Income Tax New Regime" },
    { ruleType: "income_tax" as const, code: "IT_OLD", name: "Income Tax Old Regime" },
  ];

  for (const r of rules) {
    const rule = await prisma.statutoryRule.upsert({
      where: { companyId_code: { companyId, code: r.code } },
      update: { name: r.name, ruleType: r.ruleType },
      create: { companyId, ...r, status: "active" },
    });

    const existingVersion = await prisma.statutoryVersion.findFirst({
      where: { statutoryRuleId: rule.id, financialYearId: fy.id, versionNumber: 1 },
    });
    if (existingVersion) continue;

    const version = await prisma.statutoryVersion.create({
      data: {
        companyId,
        statutoryRuleId: rule.id,
        financialYearId: fy.id,
        versionNumber: 1,
        effectiveFrom: fy.startDate,
        status: "active",
      },
    });

    if (r.code === "PF") {
      await prisma.pFConfiguration.create({
        data: {
          companyId,
          statutoryVersionId: version.id,
          employeeContributionRate: 12,
          employerContributionRate: 12,
          epsRate: 8.33,
          adminChargeRate: 0.5,
          edliRate: 0.5,
          edliAdminRate: 0,
          wageCeiling: 15000,
          vpfAllowed: true,
        },
      });
    } else if (r.code === "ESI") {
      await prisma.eSIConfiguration.create({
        data: {
          companyId,
          statutoryVersionId: version.id,
          employeeRate: 0.75,
          employerRate: 3.25,
          eligibilityCeiling: 21000,
        },
      });
    } else if (r.code === "PT_MH") {
      await prisma.professionalTaxConfiguration.create({
        data: {
          companyId,
          statutoryVersionId: version.id,
          stateCode: "MH",
          stateName: "Maharashtra",
          maxAmount: 2500,
          slabs: [
            { from: 0, to: 7500, amount: 0 },
            { from: 7501, to: 10000, amount: 175 },
            { from: 10001, to: null, amount: 200 },
          ],
        },
      });
    } else if (r.code === "IT_NEW") {
      await prisma.incomeTaxConfiguration.create({
        data: {
          companyId,
          statutoryVersionId: version.id,
          regime: "new",
          standardDeduction: 75000,
          rebateLimit: 700000,
          rebateAmount: 25000,
          cessRate: 4,
          slabs: [
            { from: 0, to: 300000, rate: 0 },
            { from: 300001, to: 700000, rate: 5 },
            { from: 700001, to: 1000000, rate: 10 },
            { from: 1000001, to: 1200000, rate: 15 },
            { from: 1200001, to: 1500000, rate: 20 },
            { from: 1500001, to: null, rate: 30 },
          ],
          surchargeSlabs: [{ from: 5000000, to: null, rate: 10 }],
        },
      });
    } else if (r.code === "IT_OLD") {
      await prisma.incomeTaxConfiguration.create({
        data: {
          companyId,
          statutoryVersionId: version.id,
          regime: "old",
          standardDeduction: 50000,
          rebateLimit: 500000,
          rebateAmount: 12500,
          cessRate: 4,
          slabs: [
            { from: 0, to: 250000, rate: 0 },
            { from: 250001, to: 500000, rate: 5 },
            { from: 500001, to: 1000000, rate: 20 },
            { from: 1000001, to: null, rate: 30 },
          ],
          surchargeSlabs: [{ from: 5000000, to: null, rate: 10 }],
        },
      });
    }
  }

  console.log(`Seeded statutory defaults for ${fy.code}.`);
}
