import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createLoanAuditService } from "@/modules/loan-recovery/application/loan-audit.service";
import type { RecoveryCalculationResult } from "@/modules/loan-recovery/domain/types";
import type { recoveryAdjustmentSchema } from "@/modules/loan-recovery/validation/schemas";
import type { z } from "zod";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class RecoveryService extends BaseRepository {
  async calculateForPayroll(params: {
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<RecoveryCalculationResult> {
    const companyId = this.requireCompanyId();
    const warnings: string[] = [];
    const breakdown = {
      loanRecovery: 0,
      advanceRecovery: 0,
      penaltyRecovery: 0,
      manualRecovery: 0,
      assetRecovery: 0,
      loanDisbursement: 0,
      advanceDisbursement: 0,
      total: 0,
    };
    const loanEmiIds: string[] = [];
    const advanceRecoveryAmounts: Array<{ advanceId: string; amount: number }> = [];

    const dueEmis = await prisma.loanEMISchedule.findMany({
      where: {
        companyId,
        payrollCalculationId: null,
        status: { in: ["scheduled", "due", "overdue"] },
        dueDate: { lte: params.periodEnd },
        employeeLoan: {
          employeeId: params.employeeId,
          companyId,
          status: "active",
          deletedAt: null,
          startRecoveryDate: { lte: params.periodEnd },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    for (const emi of dueEmis) {
      const existing = await prisma.loanRecovery.findFirst({
        where: { emiScheduleId: emi.id },
      });
      if (existing) continue;
      const amount = Number(emi.installmentAmount);
      breakdown.loanRecovery = round2(breakdown.loanRecovery + amount);
      loanEmiIds.push(emi.id);
    }

    const activeAdvances = await prisma.salaryAdvance.findMany({
      where: {
        companyId,
        employeeId: params.employeeId,
        status: "active",
        deletedAt: null,
        outstandingBalance: { gt: 0 },
        recoveryStartDate: { lte: params.periodEnd },
      },
    });

    for (const advance of activeAdvances) {
      const recoveredCount = await prisma.advanceRecovery.count({
        where: { salaryAdvanceId: advance.id },
      });
      if (recoveredCount >= advance.installmentCount) continue;

      const alreadyThisPeriod = await prisma.advanceRecovery.findFirst({
        where: {
          salaryAdvanceId: advance.id,
          recoveredAt: { gte: params.periodStart, lte: params.periodEnd },
        },
      });
      if (alreadyThisPeriod) {
        warnings.push(`Advance ${advance.advanceNumber} already recovered in period`);
        continue;
      }

      const amount = round2(Math.min(Number(advance.installmentAmount), Number(advance.outstandingBalance)));
      if (amount <= 0) continue;
      breakdown.advanceRecovery = round2(breakdown.advanceRecovery + amount);
      advanceRecoveryAmounts.push({ advanceId: advance.id, amount });
    }

    const adjustments = await prisma.recoveryAdjustment.findMany({
      where: {
        companyId,
        employeeId: params.employeeId,
        createdAt: { gte: params.periodStart, lte: params.periodEnd },
      },
    });
    for (const adj of adjustments) {
      if (adj.adjustmentType === "penalty") breakdown.penaltyRecovery = round2(breakdown.penaltyRecovery + Number(adj.amount));
      if (adj.adjustmentType === "manual") breakdown.manualRecovery = round2(breakdown.manualRecovery + Number(adj.amount));
      if (adj.adjustmentType === "waiver") warnings.push(`Waiver recorded: ${adj.amount}`);
    }

    breakdown.total = round2(
      breakdown.loanRecovery +
        breakdown.advanceRecovery +
        breakdown.penaltyRecovery +
        breakdown.manualRecovery +
        breakdown.assetRecovery,
    );

    const context: Record<string, number> = {
      LOAN_RECOVERY: breakdown.loanRecovery,
      ADVANCE_RECOVERY: breakdown.advanceRecovery,
    };
    const components = [
      { code: "LOAN_RECOVERY", name: "Loan Recovery", amount: breakdown.loanRecovery },
      { code: "ADVANCE_RECOVERY", name: "Advance Recovery", amount: breakdown.advanceRecovery },
    ].filter((c) => c.amount > 0);

    if (breakdown.penaltyRecovery > 0) {
      context.PENALTY_RECOVERY = breakdown.penaltyRecovery;
      components.push({ code: "PENALTY_RECOVERY", name: "Penalty Recovery", amount: breakdown.penaltyRecovery });
    }

    return { breakdown, context, components, warnings, metadata: { loanEmiIds, advanceRecoveryAmounts } };
  }

  async listHistory(params: { employeeId?: string; limit?: number }) {
    const companyId = this.requireCompanyId();
    return prisma.recoveryHistory.findMany({
      where: {
        companyId,
        ...(params.employeeId ? { employeeId: params.employeeId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50,
    });
  }

  async createAdjustment(input: z.infer<typeof recoveryAdjustmentSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.recoveryAdjustment.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        entityType: input.entityType,
        entityId: input.entityId,
        adjustmentType: input.adjustmentType,
        amount: input.amount,
        reason: input.reason ?? null,
        createdBy: actorUserId,
      },
    });

    if (input.adjustmentType === "waiver" || input.adjustmentType === "write_off") {
      if (input.entityType === "loan") {
        await prisma.employeeLoan.updateMany({
          where: { id: input.entityId, companyId },
          data: {
            outstandingBalance: { decrement: input.amount },
            ...(input.adjustmentType === "write_off" ? { status: "completed" } : {}),
          },
        });
      } else {
        await prisma.salaryAdvance.updateMany({
          where: { id: input.entityId, companyId },
          data: {
            outstandingBalance: { decrement: input.amount },
            ...(input.adjustmentType === "write_off" ? { status: "completed" } : {}),
          },
        });
      }
    }

    await createLoanAuditService(companyId).record({
      entityType: input.entityType,
      entityId: input.entityId,
      action: "recovery_adjustment",
      actorUserId,
      metadata: { adjustmentType: input.adjustmentType, amount: input.amount },
    });

    return row;
  }

  async persistPayrollRecovery(params: {
    employeeId: string;
    payrollCalculationId: string;
    recovery: RecoveryCalculationResult;
    periodEnd: Date;
    actorUserId?: string;
  }) {
    const companyId = this.requireCompanyId();
    const { recovery, payrollCalculationId, employeeId, periodEnd, actorUserId } = params;

    const existingLoan = await prisma.loanRecovery.findFirst({ where: { payrollCalculationId } });
    const existingAdvance = await prisma.advanceRecovery.findFirst({ where: { payrollCalculationId } });
    if (existingLoan || existingAdvance) return;

    for (const emiId of recovery.metadata.loanEmiIds) {
      const emi = await prisma.loanEMISchedule.findFirst({
        where: { id: emiId, companyId },
        include: { employeeLoan: true },
      });
      if (!emi) continue;

      await prisma.loanRecovery.create({
        data: {
          companyId,
          employeeId,
          employeeLoanId: emi.employeeLoanId,
          emiScheduleId: emi.id,
          payrollCalculationId,
          recoveryType: "emi",
          amount: emi.installmentAmount,
          createdBy: actorUserId,
        },
      });

      await prisma.loanEMISchedule.update({
        where: { id: emi.id },
        data: { status: "paid", paidAt: new Date(), payrollCalculationId },
      });

      const newOutstanding = Math.max(0, Number(emi.employeeLoan.outstandingBalance) - Number(emi.installmentAmount));
      await prisma.employeeLoan.update({
        where: { id: emi.employeeLoanId },
        data: {
          outstandingBalance: newOutstanding,
          recoveredAmount: { increment: Number(emi.installmentAmount) },
          status: newOutstanding <= 0 ? "completed" : "active",
        },
      });

      await prisma.recoveryHistory.create({
        data: {
          companyId,
          employeeId,
          entityType: "loan",
          entityId: emi.employeeLoanId,
          recoveryType: "emi",
          amount: emi.installmentAmount,
          balanceAfter: newOutstanding,
          createdBy: actorUserId,
          metadata: { emiNumber: emi.emiNumber, payrollCalculationId } as object,
        },
      });
    }

    for (const item of recovery.metadata.advanceRecoveryAmounts) {
      const advance = await prisma.salaryAdvance.findFirst({ where: { id: item.advanceId, companyId } });
      if (!advance) continue;

      await prisma.advanceRecovery.create({
        data: {
          companyId,
          employeeId,
          salaryAdvanceId: item.advanceId,
          payrollCalculationId,
          recoveryType: "advance",
          amount: item.amount,
          createdBy: actorUserId,
        },
      });

      const newOutstanding = Math.max(0, Number(advance.outstandingBalance) - item.amount);
      await prisma.salaryAdvance.update({
        where: { id: item.advanceId },
        data: {
          outstandingBalance: newOutstanding,
          recoveredAmount: { increment: item.amount },
          status: newOutstanding <= 0 ? "completed" : "active",
        },
      });

      await prisma.recoveryHistory.create({
        data: {
          companyId,
          employeeId,
          entityType: "advance",
          entityId: item.advanceId,
          recoveryType: "advance",
          amount: item.amount,
          balanceAfter: newOutstanding,
          createdBy: actorUserId,
          metadata: { payrollCalculationId } as object,
        },
      });
    }

    if (recovery.breakdown.total > 0) {
      await createLoanAuditService(companyId).record({
        entityType: "payroll_calculation",
        entityId: payrollCalculationId,
        action: "recovery_processed",
        actorUserId,
        metadata: { ...recovery.breakdown, periodEnd: dateOnly(periodEnd).toISOString() },
      });
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createRecoveryService(companyId: string) {
  return new RecoveryService(companyId);
}
