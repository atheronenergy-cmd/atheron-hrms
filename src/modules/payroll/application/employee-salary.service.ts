import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createSalaryComponentService } from "@/modules/payroll/application/salary-component.service";
import { createSalaryFormulaService } from "@/modules/payroll/application/salary-formula-crud.service";
import { createSalaryStructureService } from "@/modules/payroll/application/salary-structure.service";
import { createSalaryTemplateService } from "@/modules/payroll/application/salary-template.service";
import { recordSalaryAudit } from "@/modules/payroll/application/salary-audit.service";
import type { EmployeeSalaryListItem, SalaryRevisionListItem } from "@/modules/payroll/domain/types";
import type { EmployeeSalaryInput, EmployeeSalaryQueryInput, SalaryRevisionInput } from "@/modules/payroll/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export class EmployeeSalaryService extends BaseRepository {
  async list(query: EmployeeSalaryQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.EmployeeSalaryWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.approvalStatus ? { approvalStatus: query.approvalStatus } : {}),
      ...(query.search
        ? {
            employee: {
              OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { employeeCode: { contains: query.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.employeeSalary.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { effectiveFrom: "desc" },
        include: {
          employee: { select: { employeeCode: true, firstName: true, lastName: true } },
          salaryStructure: { select: { code: true, name: true } },
        },
      }),
      prisma.employeeSalary.count({ where }),
    ]);

    const items: EmployeeSalaryListItem[] = rows.map((r) => ({
      id: r.id,
      employeeCode: r.employee.employeeCode,
      employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
      structureCode: r.salaryStructure.code,
      structureName: r.salaryStructure.name,
      baseSalary: Number(r.baseSalary),
      monthlyCtc: Number(r.monthlyCtc),
      annualCtc: Number(r.annualCtc),
      approvalStatus: r.approvalStatus,
      effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10),
      version: r.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async assign(input: EmployeeSalaryInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", input.employeeId);

    const structure = await prisma.salaryStructure.findFirst({
      where: { id: input.salaryStructureId, companyId, deletedAt: null },
    });
    if (!structure) throw new NotFoundError("Salary structure", input.salaryStructureId);

    const annualCtc = input.annualCtc || input.monthlyCtc * 12;

    const row = await prisma.employeeSalary.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        salaryStructureId: input.salaryStructureId,
        payGradeId: input.payGradeId,
        baseSalary: input.baseSalary,
        monthlyCtc: input.monthlyCtc,
        annualCtc,
        grossPlaceholder: input.grossPlaceholder,
        netPlaceholder: input.netPlaceholder,
        employerContribution: input.employerContribution,
        employeeContribution: input.employeeContribution,
        effectiveFrom: dateOnly(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? dateOnly(input.effectiveTo) : null,
        approvalStatus: input.submitForApproval ? "pending" : "draft",
        remarks: input.remarks,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await recordSalaryAudit("salary_assigned", {
      companyId,
      actorUserId,
      entityId: row.id,
      employeeId: input.employeeId,
      metadata: { structureCode: structure.code, baseSalary: input.baseSalary },
    });

    return row;
  }

  async approve(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.employeeSalary.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!existing) throw new NotFoundError("Employee salary", id);
    if (existing.approvalStatus === "approved") throw new BusinessRuleError("Salary already approved");

    await prisma.employeeSalary.updateMany({
      where: { employeeId: existing.employeeId, companyId, deletedAt: null, approvalStatus: "approved", id: { not: id } },
      data: { effectiveTo: existing.effectiveFrom, status: "inactive" },
    });

    const row = await prisma.employeeSalary.update({
      where: { id, version },
      data: { approvalStatus: "approved", approvedBy: actorUserId, approvedAt: new Date(), updatedBy: actorUserId, version: { increment: 1 } },
    });

    await recordSalaryAudit("salary_approved", { companyId, actorUserId, entityId: row.id, employeeId: row.employeeId });
    return row;
  }

  async createRevision(input: SalaryRevisionInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.salaryRevision.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        employeeSalaryId: input.employeeSalaryId,
        previousSalary: input.previousSalary,
        newSalary: input.newSalary,
        previousCtc: input.previousCtc,
        newCtc: input.newCtc,
        effectiveDate: dateOnly(input.effectiveDate),
        reason: input.reason,
        revisionType: input.revisionType,
        approvalStatus: "pending",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    await recordSalaryAudit("salary_updated", {
      companyId,
      actorUserId,
      entityId: row.id,
      employeeId: input.employeeId,
      metadata: { type: "revision", previousSalary: input.previousSalary, newSalary: input.newSalary },
    });

    return row;
  }

  async listRevisions(query: EmployeeSalaryQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [rows, totalItems] = await Promise.all([
      prisma.salaryRevision.findMany({
        where: { companyId, deletedAt: null, ...(query.employeeId ? { employeeId: query.employeeId } : {}) },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { effectiveDate: "desc" },
        include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      }),
      prisma.salaryRevision.count({ where: { companyId, deletedAt: null } }),
    ]);

    const items: SalaryRevisionListItem[] = rows.map((r) => ({
      id: r.id,
      employeeCode: r.employee.employeeCode,
      employeeName: [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" "),
      previousSalary: Number(r.previousSalary),
      newSalary: Number(r.newSalary),
      effectiveDate: r.effectiveDate.toISOString().slice(0, 10),
      reason: r.reason,
      approvalStatus: r.approvalStatus,
      approvedBy: r.approvedBy,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEmployeeSalaryService(companyId: string) {
  return new EmployeeSalaryService(companyId);
}

export function getSalaryServices(companyId: string) {
  return {
    structure: createSalaryStructureService(companyId),
    component: createSalaryComponentService(companyId),
    template: createSalaryTemplateService(companyId),
    formula: createSalaryFormulaService(companyId),
    employeeSalary: createEmployeeSalaryService(companyId),
  };
}
