import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { costCenterSchema } from "@/modules/payroll-reporting/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class CostCenterService extends BaseRepository {
  async list() {
    return prisma.costCenter.findMany({
      where: { companyId: this.requireCompanyId(), deletedAt: null },
      include: { parent: { select: { name: true, code: true } }, _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
  }

  async create(input: z.infer<typeof costCenterSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    return prisma.costCenter.create({
      data: {
        companyId,
        name: input.name,
        code: input.code,
        centerType: input.centerType,
        parentId: input.parentId ?? null,
        description: input.description ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async assignEmployee(employeeId: string, costCenterId: string | null, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", employeeId);
    if (costCenterId) {
      const cc = await prisma.costCenter.findFirst({ where: { id: costCenterId, companyId, deletedAt: null } });
      if (!cc) throw new NotFoundError("Cost center", costCenterId);
    }
    return prisma.employee.update({
      where: { id: employeeId },
      data: { costCenterId, updatedBy: actorUserId, version: { increment: 1 } },
    });
  }

  async getPayrollByCostCenter(payrollId: string) {
    const companyId = this.requireCompanyId();
    const calculations = await prisma.payrollCalculation.findMany({
      where: { payrollId, companyId, deletedAt: null },
      include: { employee: { include: { costCenter: true } } },
    });
    return Object.entries(
      calculations.reduce<Record<string, { costCenter: string; count: number; net: number }>>((acc, c) => {
        const key = c.employee.costCenter?.code ?? "UNASSIGNED";
        const name = c.employee.costCenter?.name ?? "Unassigned";
        if (!acc[key]) acc[key] = { costCenter: name, count: 0, net: 0 };
        acc[key].count += 1;
        acc[key].net += Number(c.netSalary);
        return acc;
      }, {}),
    ).map(([code, v]) => ({ code, ...v }));
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createCostCenterService(companyId: string) {
  return new CostCenterService(companyId);
}
