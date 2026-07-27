import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { encryptionService } from "@/modules/employee-financial/application/encryption.service";
import type {
  EmergencyContactItem,
  FamilyMemberItem,
} from "@/modules/employee-financial/domain/types";
import type {
  EmergencyContactInput,
  FamilyMemberInput,
  FinancialListInput,
} from "@/modules/employee-financial/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type ViewOptions = { canViewSensitive: boolean };

export class EmployeeFamilyService extends BaseRepository {
  // --- Emergency contacts ---

  async listEmergencyContacts(query: FinancialListInput, view: ViewOptions) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.EmployeeEmergencyContactWhereInput = {
      companyId,
      employeeId: query.employeeId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { relation: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.employeeEmergencyContact.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isPrimary: "desc" }, { priority: "asc" }],
      }),
      prisma.employeeEmergencyContact.count({ where }),
    ]);

    return buildPaginatedResult(
      rows.map((r) => this.toEmergencyItem(r, view)),
      totalItems,
      page,
      pageSize,
    );
  }

  async listAllEmergencyContacts(employeeId: string, view: ViewOptions) {
    const companyId = this.requireCompanyId();
    const rows = await prisma.employeeEmergencyContact.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { priority: "asc" }],
    });
    return rows.map((r) => this.toEmergencyItem(r, view));
  }

  async createEmergencyContact(input: EmergencyContactInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    if (input.isPrimary) {
      await prisma.employeeEmergencyContact.updateMany({
        where: { companyId, employeeId: input.employeeId, deletedAt: null, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return prisma.employeeEmergencyContact.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        name: input.name,
        relation: input.relation,
        mobileEnc: encryptionService.encrypt(input.mobile)!,
        email: input.email || null,
        address: (input.address ?? {}) as object,
        priority: input.priority,
        isPrimary: input.isPrimary,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async updateEmergencyContact(
    id: string,
    version: number,
    input: Partial<EmergencyContactInput>,
    actorUserId: string,
  ) {
    const companyId = this.requireCompanyId();
    const existing = await this.getEmergencyRaw(id, companyId);

    if (input.isPrimary) {
      await prisma.employeeEmergencyContact.updateMany({
        where: { companyId, employeeId: existing.employeeId, deletedAt: null, isPrimary: true, NOT: { id } },
        data: { isPrimary: false },
      });
    }

    return prisma.employeeEmergencyContact.update({
      where: { id, version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.relation !== undefined ? { relation: input.relation } : {}),
        ...(input.mobile !== undefined ? { mobileEnc: encryptionService.encrypt(input.mobile)! } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.address !== undefined ? { address: (input.address ?? {}) as object } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async deleteEmergencyContact(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.getEmergencyRaw(id, companyId);
    return prisma.employeeEmergencyContact.update({
      where: { id, version },
      data: { deletedAt: new Date(), deletedBy: actorUserId, status: "inactive", version: { increment: 1 } },
    });
  }

  // --- Family members ---

  async listFamilyMembers(query: FinancialListInput, view: ViewOptions) {
    void view;
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.EmployeeFamilyMemberWhereInput = {
      companyId,
      employeeId: query.employeeId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { relation: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.employeeFamilyMember.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.employeeFamilyMember.count({ where }),
    ]);

    return buildPaginatedResult(
      rows.map((r) => this.toFamilyItem(r)),
      totalItems,
      page,
      pageSize,
    );
  }

  async listAllFamilyMembers(employeeId: string) {
    const companyId = this.requireCompanyId();
    const rows = await prisma.employeeFamilyMember.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toFamilyItem(r));
  }

  async createFamilyMember(input: FamilyMemberInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    return prisma.employeeFamilyMember.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        name: input.name,
        relation: input.relation,
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
        occupation: input.occupation ?? null,
        isDependent: input.isDependent,
        dependentSince: input.dependentSince ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async updateFamilyMember(
    id: string,
    version: number,
    input: Partial<FamilyMemberInput>,
    actorUserId: string,
  ) {
    const companyId = this.requireCompanyId();
    await this.getFamilyRaw(id, companyId);

    return prisma.employeeFamilyMember.update({
      where: { id, version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.relation !== undefined ? { relation: input.relation } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth ?? null } : {}),
        ...(input.gender !== undefined ? { gender: input.gender ?? null } : {}),
        ...(input.occupation !== undefined ? { occupation: input.occupation ?? null } : {}),
        ...(input.isDependent !== undefined ? { isDependent: input.isDependent } : {}),
        ...(input.dependentSince !== undefined ? { dependentSince: input.dependentSince ?? null } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async deleteFamilyMember(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.getFamilyRaw(id, companyId);
    return prisma.employeeFamilyMember.update({
      where: { id, version },
      data: { deletedAt: new Date(), deletedBy: actorUserId, status: "inactive", version: { increment: 1 } },
    });
  }

  private toEmergencyItem(
    r: Prisma.EmployeeEmergencyContactGetPayload<object>,
    view: ViewOptions,
  ): EmergencyContactItem {
    const mobilePlain = encryptionService.decrypt(r.mobileEnc, view.canViewSensitive);
    return {
      id: r.id,
      employeeId: r.employeeId,
      name: r.name,
      relation: r.relation,
      mobile: mobilePlain ?? encryptionService.mask("9999999999", "phone", false),
      email: r.email,
      address: (r.address as Record<string, unknown>) ?? {},
      priority: r.priority,
      isPrimary: r.isPrimary,
      version: r.version,
    };
  }

  private toFamilyItem(r: Prisma.EmployeeFamilyMemberGetPayload<object>): FamilyMemberItem {
    return {
      id: r.id,
      employeeId: r.employeeId,
      name: r.name,
      relation: r.relation,
      dateOfBirth: r.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      gender: r.gender,
      occupation: r.occupation,
      isDependent: r.isDependent,
      dependentSince: r.dependentSince?.toISOString().slice(0, 10) ?? null,
      version: r.version,
    };
  }

  private async getEmergencyRaw(id: string, companyId: string) {
    const row = await prisma.employeeEmergencyContact.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!row) throw new NotFoundError("Emergency contact", id);
    return row;
  }

  private async getFamilyRaw(id: string, companyId: string) {
    const row = await prisma.employeeFamilyMember.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!row) throw new NotFoundError("Family member", id);
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

export function createEmployeeFamilyService(companyId: string) {
  return new EmployeeFamilyService(companyId);
}
