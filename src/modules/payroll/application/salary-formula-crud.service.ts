import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { salaryFormulaEngine } from "@/modules/payroll/application/salary-formula.service";
import { recordSalaryAudit } from "@/modules/payroll/application/salary-audit.service";
import type { FormulaPreviewInput, SalaryFormulaInput, SalaryQueryInput } from "@/modules/payroll/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

export class SalaryFormulaService extends BaseRepository {
  async list(query: SalaryQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      companyId,
      deletedAt: null,
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { code: { contains: query.search, mode: "insensitive" } }] } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.salaryFormula.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: "asc" } }),
      prisma.salaryFormula.count({ where }),
    ]);

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async create(input: SalaryFormulaInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const validation = salaryFormulaEngine.validate(input.expression);
    if (!validation.valid) throw new BusinessRuleError(validation.errors.join(", "));

    const row = await prisma.salaryFormula.create({
      data: {
        companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        expression: input.expression,
        description: input.description,
        variables: validation.dependencies,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await recordSalaryAudit("formula_changed", { companyId, actorUserId, entityId: row.id, metadata: { action: "created" } });
    return row;
  }

  async update(id: string, input: Partial<SalaryFormulaInput>, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    if (input.expression) {
      const validation = salaryFormulaEngine.validate(input.expression);
      if (!validation.valid) throw new BusinessRuleError(validation.errors.join(", "));
    }

    const row = await prisma.salaryFormula.update({
      where: { id, companyId, version },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.expression ? { expression: input.expression, variables: salaryFormulaEngine.validate(input.expression).dependencies } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });

    await recordSalaryAudit("formula_changed", { companyId, actorUserId, entityId: row.id, metadata: { action: "updated" } });
    return row;
  }

  async preview(input: FormulaPreviewInput) {
    return salaryFormulaEngine.preview(input.expression, input.context);
  }

  async get(id: string) {
    const row = await prisma.salaryFormula.findFirst({ where: { id, companyId: this.requireCompanyId(), deletedAt: null } });
    if (!row) throw new NotFoundError("Salary formula", id);
    return row;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createSalaryFormulaService(companyId: string) {
  return new SalaryFormulaService(companyId);
}
