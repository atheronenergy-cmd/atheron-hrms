import { prisma } from "@/infrastructure/database/prisma-client";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/shared/errors";

const LOCKED_STATUSES = new Set(["locked", "paid", "approved"]);

export class PayrollValidationService {
  async validateGeneration(companyId: string, payrollPeriodId: string, employeeIds: string[]) {
    const period = await prisma.payrollPeriod.findFirst({
      where: { id: payrollPeriodId, companyId, deletedAt: null },
    });
    if (!period) throw new NotFoundError("Payroll period", payrollPeriodId);
    if (period.status === "locked") throw new BusinessRuleError("Payroll period is locked");

    const errors: string[] = [];
    for (const employeeId of employeeIds) {
      const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
      if (!employee) {
        errors.push(`Employee ${employeeId} not found`);
        continue;
      }

      const salary = await prisma.employeeSalary.findFirst({
        where: {
          employeeId,
          companyId,
          deletedAt: null,
          approvalStatus: "approved",
          effectiveFrom: { lte: period.endDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.startDate } }],
        },
      });
      if (!salary) errors.push(`Missing approved salary structure for ${employee.employeeCode}`);

      const duplicate = await prisma.payrollCalculation.findFirst({
        where: {
          employeeId,
          companyId,
          deletedAt: null,
          payroll: { payrollPeriodId, deletedAt: null, status: { notIn: ["cancelled"] } },
        },
      });
      if (duplicate) errors.push(`Duplicate payroll exists for ${employee.employeeCode} in this period`);
    }

    if (errors.length) throw new BusinessRuleError("Payroll validation failed", { errors });
    return { period, valid: true };
  }

  async validateEditable(payrollId: string, companyId: string, version?: number) {
    const payroll = await prisma.payroll.findFirst({ where: { id: payrollId, companyId, deletedAt: null } });
    if (!payroll) throw new NotFoundError("Payroll", payrollId);
    if (version !== undefined && payroll.version !== version) throw new ConflictError("Payroll was modified. Refresh and try again.");
    if (LOCKED_STATUSES.has(payroll.status)) throw new BusinessRuleError(`Payroll is ${payroll.status} and cannot be edited`);
    return payroll;
  }

  validateNetSalary(net: number) {
    if (net < 0) throw new BusinessRuleError("Net salary cannot be negative");
  }
}

export const payrollValidationService = new PayrollValidationService();
