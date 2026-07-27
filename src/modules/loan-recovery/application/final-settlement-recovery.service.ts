import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { FinalSettlementRecoverySummary } from "@/modules/loan-recovery/domain/types";
import { NotFoundError } from "@/shared/errors";

export class FinalSettlementRecoveryService extends BaseRepository {
  async getRecoverySummary(employeeId: string): Promise<FinalSettlementRecoverySummary> {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", employeeId);

    const loans = await prisma.employeeLoan.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        status: { in: ["active", "approved"] },
        outstandingBalance: { gt: 0 },
      },
      include: {
        emiSchedules: {
          where: { status: { in: ["scheduled", "due", "overdue"] } },
          select: { id: true },
        },
      },
    });

    const advances = await prisma.salaryAdvance.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        status: "active",
        outstandingBalance: { gt: 0 },
      },
    });

    const outstandingLoans = loans.map((l) => ({
      loanId: l.id,
      loanNumber: l.loanNumber,
      outstandingBalance: Number(l.outstandingBalance),
      pendingEmis: l.emiSchedules.length,
    }));

    const outstandingAdvances = advances.map((a) => ({
      advanceId: a.id,
      advanceNumber: a.advanceNumber,
      outstandingBalance: Number(a.outstandingBalance),
    }));

    const totalOutstanding =
      outstandingLoans.reduce((s, l) => s + l.outstandingBalance, 0) +
      outstandingAdvances.reduce((s, a) => s + a.outstandingBalance, 0);

    const recoverySummary = [
      outstandingLoans.length ? `Outstanding loans: ${outstandingLoans.length} (₹${totalOutstanding.toFixed(2)})` : null,
      outstandingAdvances.length ? `Outstanding advances: ${outstandingAdvances.length}` : null,
      totalOutstanding > 0 ? "Adjust final settlement for pending recoveries" : "No pending loan/advance recoveries",
    ]
      .filter(Boolean)
      .join(". ");

    return {
      employeeId,
      outstandingLoans,
      outstandingAdvances,
      totalOutstanding,
      recoverySummary,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createFinalSettlementRecoveryService(companyId: string) {
  return new FinalSettlementRecoveryService(companyId);
}
