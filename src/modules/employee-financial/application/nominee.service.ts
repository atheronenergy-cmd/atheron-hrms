import { prisma } from "@/infrastructure/database/prisma-client";
import { BaseRepository } from "@/infrastructure/database/base-repository";
import { encryptionService } from "@/modules/employee-financial/application/encryption.service";
import type { NomineeItem } from "@/modules/employee-financial/domain/types";
import type { NomineeInput } from "@/modules/employee-financial/validation/schemas";
import { validateNomineePercentages } from "@/modules/employee-financial/validation/schemas";
import { ConflictError, NotFoundError } from "@/shared/errors";

type ViewOptions = { canViewSensitive: boolean };

export class NomineeService extends BaseRepository {
  async listAll(employeeId: string, view: ViewOptions) {
    const companyId = this.requireCompanyId();
    const rows = await prisma.employeeNominee.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toItem(r, view));
  }

  async getTotalPercentage(employeeId: string) {
    const companyId = this.requireCompanyId();
    const rows = await prisma.employeeNominee.findMany({
      where: { companyId, employeeId, deletedAt: null },
      select: { percentage: true },
    });
    return rows.reduce((sum, r) => sum + Number(r.percentage), 0);
  }

  async create(input: NomineeInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    const existing = await prisma.employeeNominee.findMany({
      where: { companyId, employeeId: input.employeeId, deletedAt: null },
      select: { percentage: true },
    });
    const total = existing.reduce((s, r) => s + Number(r.percentage), 0) + input.percentage;
    if (!validateNomineePercentages([{ percentage: total }])) {
      throw new ConflictError(`Nominee allocation must total 100%. Current total would be ${total}%.`);
    }

    return prisma.employeeNominee.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        name: input.name,
        relation: input.relation,
        dateOfBirth: input.dateOfBirth ?? null,
        address: (input.address ?? {}) as object,
        mobileEnc: encryptionService.encrypt(input.mobile),
        percentage: input.percentage,
        nomineeType: input.nomineeType,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async update(id: string, version: number, input: Partial<NomineeInput>, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await this.getRaw(id, companyId);

    const others = await prisma.employeeNominee.findMany({
      where: { companyId, employeeId: existing.employeeId, deletedAt: null, NOT: { id } },
      select: { percentage: true },
    });
    const newPct = input.percentage ?? Number(existing.percentage);
    const total = others.reduce((s, r) => s + Number(r.percentage), 0) + newPct;
    if (!validateNomineePercentages([{ percentage: total }])) {
      throw new ConflictError(`Nominee allocation must total 100%. Current total would be ${total}%.`);
    }

    return prisma.employeeNominee.update({
      where: { id, version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.relation !== undefined ? { relation: input.relation } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth ?? null } : {}),
        ...(input.address !== undefined ? { address: (input.address ?? {}) as object } : {}),
        ...(input.mobile !== undefined ? { mobileEnc: encryptionService.encrypt(input.mobile) } : {}),
        ...(input.percentage !== undefined ? { percentage: input.percentage } : {}),
        ...(input.nomineeType !== undefined ? { nomineeType: input.nomineeType } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async delete(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.getRaw(id, companyId);
    return prisma.employeeNominee.update({
      where: { id, version },
      data: { deletedAt: new Date(), deletedBy: actorUserId, status: "inactive", version: { increment: 1 } },
    });
  }

  private toItem(r: { id: string; employeeId: string; name: string; relation: string; dateOfBirth: Date | null; address: unknown; mobileEnc: string | null; percentage: unknown; nomineeType: string; version: number }, view: ViewOptions): NomineeItem {
    const mobilePlain = encryptionService.decrypt(r.mobileEnc, view.canViewSensitive);
    return {
      id: r.id,
      employeeId: r.employeeId,
      name: r.name,
      relation: r.relation,
      dateOfBirth: r.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      address: (r.address as Record<string, unknown>) ?? {},
      mobile: mobilePlain ?? (r.mobileEnc ? encryptionService.mask("9999999999", "phone", false) : null),
      percentage: Number(r.percentage),
      nomineeType: r.nomineeType,
      version: r.version,
    };
  }

  private async getRaw(id: string, companyId: string) {
    const row = await prisma.employeeNominee.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!row) throw new NotFoundError("Nominee", id);
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

export function createNomineeService(companyId: string) {
  return new NomineeService(companyId);
}
