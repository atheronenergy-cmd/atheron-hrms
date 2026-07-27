import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { recordSalaryAudit } from "@/modules/payroll/application/salary-audit.service";
import type { SalaryQueryInput, SalaryTemplateInput } from "@/modules/payroll/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class SalaryTemplateService extends BaseRepository {
  async list(query: SalaryQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      companyId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.salaryTemplate.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ priority: "desc" }, { name: "asc" }],
        include: { salaryStructure: { select: { code: true, name: true } } },
      }),
      prisma.salaryTemplate.count({ where }),
    ]);

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async create(input: SalaryTemplateInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.salaryTemplate.create({
      data: {
        companyId,
        salaryStructureId: input.salaryStructureId,
        name: input.name,
        scope: input.scope,
        branchId: input.branchId,
        departmentId: input.departmentId,
        designationId: input.designationId,
        employeeId: input.employeeId,
        priority: input.priority,
        effectiveFrom: dateOnly(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? dateOnly(input.effectiveTo) : null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    await recordSalaryAudit("salary_created", { companyId, actorUserId, entityId: row.id, metadata: { type: "template" } });
    return row;
  }

  async resolveForEmployee(employeeId: string, asOf = new Date()) {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
      select: { id: true, branchId: true, departmentId: true, designationId: true },
    });
    if (!employee) throw new NotFoundError("Employee", employeeId);

    const day = dateOnly(asOf);
    const templates = await prisma.salaryTemplate.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: "active",
        effectiveFrom: { lte: day },
        AND: [
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }] },
          {
            OR: [
              { scope: "employee", employeeId: employee.id },
              { scope: "department", departmentId: employee.departmentId },
              { scope: "designation", designationId: employee.designationId },
              { scope: "branch", branchId: employee.branchId },
            ],
          },
        ],
      },
      include: { salaryStructure: true },
      orderBy: { priority: "desc" },
    });

    return templates[0] ?? null;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createSalaryTemplateService(companyId: string) {
  return new SalaryTemplateService(companyId);
}
