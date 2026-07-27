import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { salaryFormulaEngine } from "@/modules/payroll/application/salary-formula.service";
import { recordSalaryAudit } from "@/modules/payroll/application/salary-audit.service";
import type { SalaryComponentListItem } from "@/modules/payroll/domain/types";
import type { SalaryComponentInput, SalaryComponentQueryInput } from "@/modules/payroll/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

export class SalaryComponentService extends BaseRepository {
  async list(query: SalaryComponentQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.SalaryComponentWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.salaryStructureId ? { salaryStructureId: query.salaryStructureId } : {}),
      ...(query.componentType ? { componentType: query.componentType } : {}),
      ...(query.calculationType ? { calculationType: query.calculationType } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { code: { contains: query.search, mode: "insensitive" } }] }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.salaryComponent.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { salaryStructure: { select: { code: true, name: true } } },
      }),
      prisma.salaryComponent.count({ where }),
    ]);

    const items: SalaryComponentListItem[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      structureCode: r.salaryStructure.code,
      structureName: r.salaryStructure.name,
      componentType: r.componentType,
      calculationType: r.calculationType,
      amount: Number(r.amount),
      sortOrder: r.sortOrder,
      status: r.status,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async create(input: SalaryComponentInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.validateComponent(input);

    const row = await prisma.salaryComponent.create({
      data: {
        companyId,
        salaryStructureId: input.salaryStructureId,
        categoryId: input.categoryId,
        formulaId: input.formulaId,
        name: input.name,
        code: input.code.toUpperCase(),
        componentType: input.componentType,
        calculationType: input.calculationType,
        amount: input.amount,
        percentageOf: input.percentageOf?.toUpperCase(),
        percentageValue: input.percentageValue,
        formulaExpression: input.formulaExpression,
        isTaxable: input.isTaxable,
        isEmployerContribution: input.isEmployerContribution,
        affectsGross: input.affectsGross,
        sortOrder: input.sortOrder,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await recordSalaryAudit("salary_created", { companyId, actorUserId, entityId: row.id, metadata: { type: "component", code: row.code } });
    return row;
  }

  async update(id: string, input: Partial<SalaryComponentInput>, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    if (input.formulaExpression || input.calculationType) {
      await this.validateComponent({ ...(await this.get(id)), ...input } as SalaryComponentInput);
    }

    return prisma.salaryComponent.update({
      where: { id, companyId, version },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.percentageOf !== undefined ? { percentageOf: input.percentageOf?.toUpperCase() } : {}),
        ...(input.percentageValue !== undefined ? { percentageValue: input.percentageValue } : {}),
        ...(input.formulaExpression !== undefined ? { formulaExpression: input.formulaExpression } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async softDelete(id: string, version: number, actorUserId: string) {
    return prisma.salaryComponent.update({
      where: { id, companyId: this.requireCompanyId(), version },
      data: { deletedAt: new Date(), status: "inactive", updatedBy: actorUserId, version: { increment: 1 } },
    });
  }

  async get(id: string) {
    const row = await prisma.salaryComponent.findFirst({ where: { id, companyId: this.requireCompanyId(), deletedAt: null } });
    if (!row) throw new NotFoundError("Salary component", id);
    return row;
  }

  private async validateComponent(input: SalaryComponentInput) {
    if (input.calculationType === "percentage" && (!input.percentageOf || input.percentageValue === undefined)) {
      throw new BusinessRuleError("Percentage components require percentageOf and percentageValue");
    }
    if (input.calculationType === "formula" && input.formulaExpression) {
      const validation = salaryFormulaEngine.validate(input.formulaExpression);
      if (!validation.valid) throw new BusinessRuleError(validation.errors.join(", "));
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createSalaryComponentService(companyId: string) {
  return new SalaryComponentService(companyId);
}
