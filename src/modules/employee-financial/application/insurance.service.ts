import type { Prisma } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma-client";
import { BaseRepository } from "@/infrastructure/database/base-repository";
import { encryptionService } from "@/modules/employee-financial/application/encryption.service";
import type { InsuranceItem } from "@/modules/employee-financial/domain/types";
import type { FinancialListInput, InsuranceInput } from "@/modules/employee-financial/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type ViewOptions = { canViewSensitive: boolean };

export class InsuranceService extends BaseRepository {
  async list(query: FinancialListInput, view: ViewOptions) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.EmployeeInsuranceWhereInput = {
      companyId,
      employeeId: query.employeeId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { provider: { contains: query.search, mode: "insensitive" } },
              { nomineeName: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.employeeInsurance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.employeeInsurance.count({ where }),
    ]);

    return buildPaginatedResult(
      rows.map((r) => this.toItem(r, view)),
      totalItems,
      page,
      pageSize,
    );
  }

  async listAll(employeeId: string, view: ViewOptions) {
    const companyId = this.requireCompanyId();
    const rows = await prisma.employeeInsurance.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toItem(r, view));
  }

  async create(input: InsuranceInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    return prisma.employeeInsurance.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        provider: input.provider,
        policyNumberEnc: encryptionService.encrypt(input.policyNumber)!,
        coverageAmount: input.coverageAmount ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        nomineeName: input.nomineeName ?? null,
        policyStatus: input.policyStatus,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async update(id: string, version: number, input: Partial<InsuranceInput>, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.getRaw(id, companyId);

    return prisma.employeeInsurance.update({
      where: { id, version },
      data: {
        ...(input.provider !== undefined ? { provider: input.provider } : {}),
        ...(input.policyNumber !== undefined
          ? { policyNumberEnc: encryptionService.encrypt(input.policyNumber)! }
          : {}),
        ...(input.coverageAmount !== undefined ? { coverageAmount: input.coverageAmount ?? null } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate ?? null } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate ?? null } : {}),
        ...(input.nomineeName !== undefined ? { nomineeName: input.nomineeName ?? null } : {}),
        ...(input.policyStatus !== undefined ? { policyStatus: input.policyStatus } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async softDelete(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.getRaw(id, companyId);
    return prisma.employeeInsurance.update({
      where: { id, version },
      data: {
        deletedAt: new Date(),
        deletedBy: actorUserId,
        status: "inactive",
        version: { increment: 1 },
      },
    });
  }

  private toItem(
    r: Prisma.EmployeeInsuranceGetPayload<object>,
    view: ViewOptions,
  ): InsuranceItem {
    const policyPlain = encryptionService.decrypt(r.policyNumberEnc, view.canViewSensitive);
    return {
      id: r.id,
      employeeId: r.employeeId,
      provider: r.provider,
      policyNumber: policyPlain ?? encryptionService.mask("POL123456", "generic", false),
      coverageAmount: r.coverageAmount ? Number(r.coverageAmount) : null,
      startDate: r.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
      nomineeName: r.nomineeName,
      policyStatus: r.policyStatus,
      version: r.version,
    };
  }

  private async getRaw(id: string, companyId: string) {
    const row = await prisma.employeeInsurance.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!row) throw new NotFoundError("Insurance policy", id);
    return row;
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", employeeId);
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createInsuranceService(companyId: string) {
  return new InsuranceService(companyId);
}
