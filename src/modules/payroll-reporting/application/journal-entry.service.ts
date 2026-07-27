import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { DEFAULT_JOURNAL_ACCOUNTS, type JournalLineInput } from "@/modules/payroll-reporting/domain/types";
import { NotFoundError } from "@/shared/errors";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export class JournalEntryService extends BaseRepository {
  async generateFromPayroll(payrollId: string, actorUserId?: string, entryDate?: string, description?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({
      where: { id: payrollId, companyId, deletedAt: null },
      include: {
        payrollCalculations: {
          where: { deletedAt: null },
          include: { componentValues: true, employerContribution: true, employee: { select: { costCenter: { select: { code: true } } } } },
        },
      },
    });
    if (!payroll) throw new NotFoundError("Payroll", payrollId);

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let pfEmployer = 0;
    let esiEmployer = 0;
    let tds = 0;

    for (const calc of payroll.payrollCalculations) {
      totalGross += Number(calc.grossSalary);
      totalDeductions += Number(calc.totalDeductions);
      totalNet += Number(calc.netSalary);
      pfEmployer += Number(calc.employerContribution?.pfEmployer ?? 0);
      esiEmployer += Number(calc.employerContribution?.esiEmployer ?? 0);
      tds += Number(calc.componentValues.find((c) => ["TDS", "TAX", "INCOME_TAX"].includes(c.componentCode.toUpperCase()))?.amount ?? 0);
    }

    const lines: JournalLineInput[] = [
      { accountCode: DEFAULT_JOURNAL_ACCOUNTS.salaryExpense.code, accountName: DEFAULT_JOURNAL_ACCOUNTS.salaryExpense.name, debitAmount: round2(totalGross), creditAmount: 0 },
      { accountCode: DEFAULT_JOURNAL_ACCOUNTS.employerPf.code, accountName: DEFAULT_JOURNAL_ACCOUNTS.employerPf.name, debitAmount: round2(pfEmployer), creditAmount: 0 },
      { accountCode: DEFAULT_JOURNAL_ACCOUNTS.employerEsi.code, accountName: DEFAULT_JOURNAL_ACCOUNTS.employerEsi.name, debitAmount: round2(esiEmployer), creditAmount: 0 },
      { accountCode: DEFAULT_JOURNAL_ACCOUNTS.employeeDeductions.code, accountName: DEFAULT_JOURNAL_ACCOUNTS.employeeDeductions.name, debitAmount: 0, creditAmount: round2(totalDeductions) },
      { accountCode: DEFAULT_JOURNAL_ACCOUNTS.taxPayable.code, accountName: DEFAULT_JOURNAL_ACCOUNTS.taxPayable.name, debitAmount: 0, creditAmount: round2(tds) },
      { accountCode: DEFAULT_JOURNAL_ACCOUNTS.cashBank.code, accountName: DEFAULT_JOURNAL_ACCOUNTS.cashBank.name, debitAmount: 0, creditAmount: round2(totalNet) },
    ];

    const totalDebit = round2(lines.reduce((s, l) => s + l.debitAmount, 0));
    const totalCredit = round2(lines.reduce((s, l) => s + l.creditAmount, 0));
    const diff = round2(totalDebit - totalCredit);
    if (Math.abs(diff) > 0.01) {
      lines.push({
        accountCode: DEFAULT_JOURNAL_ACCOUNTS.roundOff.code,
        accountName: DEFAULT_JOURNAL_ACCOUNTS.roundOff.name,
        debitAmount: diff < 0 ? Math.abs(diff) : 0,
        creditAmount: diff > 0 ? diff : 0,
      });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        companyId,
        payrollId,
        entryNumber: `JE-${Date.now().toString().slice(-8)}`,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        description: description ?? `Payroll journal for ${payroll.payrollNumber}`,
        status: "draft",
        totalDebit: round2(lines.reduce((s, l) => s + l.debitAmount, 0)),
        totalCredit: round2(lines.reduce((s, l) => s + l.creditAmount, 0)),
        createdBy: actorUserId,
        lines: {
          create: lines.map((l) => ({
            companyId,
            accountCode: l.accountCode,
            accountName: l.accountName,
            debitAmount: l.debitAmount,
            creditAmount: l.creditAmount,
            costCenterCode: l.costCenterCode ?? null,
          })),
        },
      },
      include: { lines: true },
    });

    return entry;
  }

  async list(payrollId?: string) {
    return prisma.journalEntry.findMany({
      where: { companyId: this.requireCompanyId(), ...(payrollId ? { payrollId } : {}) },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createJournalEntryService(companyId: string) {
  return new JournalEntryService(companyId);
}
