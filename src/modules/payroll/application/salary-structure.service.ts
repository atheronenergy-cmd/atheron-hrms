import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { recordSalaryAudit } from "@/modules/payroll/application/salary-audit.service";
import type { SalaryStructureListItem } from "@/modules/payroll/domain/types";
import { DEFAULT_PAY_GRADES, DEFAULT_SALARY_STRUCTURES } from "@/modules/payroll/domain/types";
import type { PayGradeInput, SalaryQueryInput, SalaryStructureInput } from "@/modules/payroll/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

export class SalaryStructureService extends BaseRepository {
  async list(query: SalaryQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.SalaryStructureWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { code: { contains: query.search, mode: "insensitive" } }] }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.salaryStructure.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [query.sortBy ?? "name"]: query.sortOrder ?? "asc" },
        include: {
          payGrade: { select: { name: true } },
          _count: { select: { salaryComponents: true } },
        },
      }),
      prisma.salaryStructure.count({ where }),
    ]);

    const items: SalaryStructureListItem[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      payFrequency: r.payFrequency,
      payGradeName: r.payGrade?.name ?? null,
      componentCount: r._count.salaryComponents,
      monthlyCtcDefault: r.monthlyCtcDefault ? Number(r.monthlyCtcDefault) : null,
      status: r.status,
      version: r.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async get(id: string) {
    const row = await prisma.salaryStructure.findFirst({
      where: { id, companyId: this.requireCompanyId(), deletedAt: null },
      include: { payGrade: true, salaryComponents: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
    });
    if (!row) throw new NotFoundError("Salary structure", id);
    return row;
  }

  async create(input: SalaryStructureInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.salaryStructure.create({
      data: {
        companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        payFrequency: input.payFrequency,
        description: input.description,
        payGradeId: input.payGradeId,
        monthlyCtcDefault: input.monthlyCtcDefault,
        annualCtcDefault: input.annualCtcDefault,
        isDefault: input.isDefault,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    await recordSalaryAudit("salary_created", { companyId, actorUserId, entityId: row.id, metadata: { code: row.code } });
    return row;
  }

  async update(id: string, input: Partial<SalaryStructureInput>, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.salaryStructure.update({
      where: { id, companyId, version },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.payGradeId !== undefined ? { payGradeId: input.payGradeId } : {}),
        ...(input.monthlyCtcDefault !== undefined ? { monthlyCtcDefault: input.monthlyCtcDefault } : {}),
        ...(input.annualCtcDefault !== undefined ? { annualCtcDefault: input.annualCtcDefault } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
    await recordSalaryAudit("salary_updated", { companyId, actorUserId, entityId: row.id });
    return row;
  }

  async softDelete(id: string, version: number, actorUserId: string) {
    return prisma.salaryStructure.update({
      where: { id, companyId: this.requireCompanyId(), version },
      data: { deletedAt: new Date(), deletedBy: actorUserId, status: "inactive", version: { increment: 1 } },
    });
  }

  async listPayGrades() {
    return prisma.payGrade.findMany({
      where: { companyId: this.requireCompanyId(), deletedAt: null, status: "active" },
      orderBy: { level: "asc" },
    });
  }

  async createPayGrade(input: PayGradeInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    return prisma.payGrade.create({
      data: {
        companyId,
        name: input.name,
        code: input.code.toUpperCase(),
        level: input.level,
        minCtc: input.minCtc,
        maxCtc: input.maxCtc,
        description: input.description,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async seedDefaults(actorUserId: string) {
    const companyId = this.requireCompanyId();
    for (const g of DEFAULT_PAY_GRADES) {
      const exists = await prisma.payGrade.findFirst({ where: { companyId, code: g.code } });
      if (!exists) await this.createPayGrade(g, actorUserId);
    }
    for (const s of DEFAULT_SALARY_STRUCTURES) {
      const exists = await prisma.salaryStructure.findFirst({ where: { companyId, code: s.code } });
      if (!exists) await this.create({ ...s, payFrequency: "monthly", isDefault: false }, actorUserId);
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createSalaryStructureService(companyId: string) {
  return new SalaryStructureService(companyId);
}
