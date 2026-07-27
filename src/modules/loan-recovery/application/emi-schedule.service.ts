import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { generateEmiSchedule } from "@/modules/loan-recovery/application/loan-calculation.service";
import { createLoanAuditService } from "@/modules/loan-recovery/application/loan-audit.service";
import { NotFoundError } from "@/shared/errors";

export class EMIScheduleService extends BaseRepository {
  async generateForLoan(loanId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const loan = await prisma.employeeLoan.findFirst({
      where: { id: loanId, companyId, deletedAt: null },
      include: { emiSchedules: true },
    });
    if (!loan) throw new NotFoundError("Employee loan", loanId);
    if (!loan.startRecoveryDate) throw new Error("Start recovery date is required");

    if (loan.emiSchedules.length > 0) {
      await prisma.loanEMISchedule.deleteMany({ where: { employeeLoanId: loanId } });
    }

    const schedule = generateEmiSchedule({
      principal: Number(loan.principalAmount),
      interestType: loan.interestType,
      interestRate: Number(loan.interestRate),
      tenure: loan.tenureMonths,
      recoveryMode: loan.recoveryMode,
      startRecoveryDate: loan.startRecoveryDate,
    });

    await prisma.loanEMISchedule.createMany({
      data: schedule.map((s) => ({
        companyId,
        employeeLoanId: loanId,
        emiNumber: s.emiNumber,
        dueDate: s.dueDate,
        principalComponent: s.principalComponent,
        interestComponent: s.interestComponent,
        installmentAmount: s.installmentAmount,
        outstandingBalance: s.outstandingBalance,
        status: "scheduled",
      })),
    });

    await createLoanAuditService(companyId).record({
      entityType: "employee_loan",
      entityId: loanId,
      action: "emi_generated",
      actorUserId,
      metadata: { count: schedule.length },
    });

    return prisma.loanEMISchedule.findMany({
      where: { employeeLoanId: loanId },
      orderBy: { emiNumber: "asc" },
    });
  }

  async list(params: { loanId?: string; employeeId?: string; status?: string }) {
    const companyId = this.requireCompanyId();
    return prisma.loanEMISchedule.findMany({
      where: {
        companyId,
        ...(params.loanId ? { employeeLoanId: params.loanId } : {}),
        ...(params.status ? { status: params.status as never } : {}),
        ...(params.employeeId
          ? { employeeLoan: { employeeId: params.employeeId, deletedAt: null } }
          : {}),
      },
      include: {
        employeeLoan: {
          select: { loanNumber: true, employeeId: true },
        },
      },
      orderBy: [{ dueDate: "asc" }, { emiNumber: "asc" }],
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEMIScheduleService(companyId: string) {
  return new EMIScheduleService(companyId);
}
