import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { encryptionService } from "@/modules/employee-financial/application/encryption.service";
import type { BankDetailItem } from "@/modules/employee-financial/domain/types";
import type {
  BankDetailInput,
  FinancialListInput,
} from "@/modules/employee-financial/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

type ViewOptions = { canViewSensitive: boolean };

export class EmployeeBankService extends BaseRepository {
  async list(query: FinancialListInput, view: ViewOptions) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.EmployeeBankDetailWhereInput = {
      companyId,
      employeeId: query.employeeId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { bankName: { contains: query.search, mode: "insensitive" } },
              { accountHolderName: { contains: query.search, mode: "insensitive" } },
              { ifscCode: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.employeeBankDetail.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.employeeBankDetail.count({ where }),
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
    const rows = await prisma.employeeBankDetail.findMany({
      where: { companyId, employeeId, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => this.toItem(r, view));
  }

  async create(input: BankDetailInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    if (input.isPrimary) {
      await prisma.employeeBankDetail.updateMany({
        where: { companyId, employeeId: input.employeeId, deletedAt: null, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return prisma.employeeBankDetail.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        accountHolderName: input.accountHolderName,
        bankName: input.bankName,
        branchName: input.branchName ?? null,
        accountNumberEnc: encryptionService.encrypt(input.accountNumber)!,
        ifscCode: input.ifscCode.toUpperCase(),
        accountType: input.accountType,
        upiIdEnc: encryptionService.encrypt(input.upiId),
        isPrimary: input.isPrimary,
        remarks: input.remarks ?? null,
        verificationStatus: "pending",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  async update(
    id: string,
    version: number,
    input: Partial<BankDetailInput>,
    actorUserId: string,
  ) {
    const companyId = this.requireCompanyId();
    const existing = await this.getRaw(id, companyId);

    if (input.isPrimary) {
      await prisma.employeeBankDetail.updateMany({
        where: { companyId, employeeId: existing.employeeId, deletedAt: null, isPrimary: true, NOT: { id } },
        data: { isPrimary: false },
      });
    }

    return prisma.employeeBankDetail.update({
      where: { id, version },
      data: {
        ...(input.accountHolderName !== undefined ? { accountHolderName: input.accountHolderName } : {}),
        ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
        ...(input.branchName !== undefined ? { branchName: input.branchName ?? null } : {}),
        ...(input.accountNumber !== undefined
          ? { accountNumberEnc: encryptionService.encrypt(input.accountNumber)! }
          : {}),
        ...(input.ifscCode !== undefined ? { ifscCode: input.ifscCode.toUpperCase() } : {}),
        ...(input.accountType !== undefined ? { accountType: input.accountType } : {}),
        ...(input.upiId !== undefined ? { upiIdEnc: encryptionService.encrypt(input.upiId) } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
        verificationStatus: "pending",
        verifiedBy: null,
        verifiedAt: null,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async verify(id: string, version: number, status: "verified" | "rejected", actorUserId: string, remarks?: string) {
    const companyId = this.requireCompanyId();
    await this.getRaw(id, companyId);

    return prisma.employeeBankDetail.update({
      where: { id, version },
      data: {
        verificationStatus: status,
        verifiedBy: actorUserId,
        verifiedAt: new Date(),
        remarks: remarks ?? null,
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async softDelete(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    await this.getRaw(id, companyId);
    return prisma.employeeBankDetail.update({
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
    r: Prisma.EmployeeBankDetailGetPayload<object>,
    view: ViewOptions,
  ): BankDetailItem {
    const accountPlain = encryptionService.decrypt(r.accountNumberEnc, view.canViewSensitive);
    const upiPlain = encryptionService.decrypt(r.upiIdEnc, view.canViewSensitive);

    return {
      id: r.id,
      employeeId: r.employeeId,
      accountHolderName: r.accountHolderName,
      bankName: r.bankName,
      branchName: r.branchName,
      accountNumber: accountPlain
        ? accountPlain
        : encryptionService.mask("000000000000", "bank_account", false),
      ifscCode: r.ifscCode,
      accountType: r.accountType,
      upiId: upiPlain ?? (r.upiIdEnc ? encryptionService.mask("upi@bank", "generic", false) : null),
      verificationStatus: r.verificationStatus,
      verifiedAt: r.verifiedAt?.toISOString() ?? null,
      isPrimary: r.isPrimary,
      remarks: r.remarks,
      version: r.version,
    };
  }

  private async getRaw(id: string, companyId: string) {
    const row = await prisma.employeeBankDetail.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundError("Bank detail", id);
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

export function createEmployeeBankService(companyId: string) {
  return new EmployeeBankService(companyId);
}
