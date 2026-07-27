import type { BankFileFormat, BankProviderCode, BankTransferStatus } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { fileStorageService } from "@/infrastructure/storage/file-storage.service";
import { encryptionService } from "@/modules/employee-financial/application/encryption.service";
import { getBankTransferProvider } from "@/modules/payroll-reporting/application/bank-providers/index";
import { createPayrollReportingAuditService } from "@/modules/payroll-reporting/application/payroll-reporting-audit.service";
import type { BankTransferRow } from "@/modules/payroll-reporting/domain/types";
import type { bankBatchSchema, bankTransferStatusSchema } from "@/modules/payroll-reporting/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

function batchNumber() {
  return `BNK-${Date.now().toString().slice(-8)}`;
}

export class BankTransferService extends BaseRepository {
  async generateBatch(input: z.infer<typeof bankBatchSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({
      where: { id: input.payrollId, companyId, deletedAt: null },
      include: {
        payrollCalculations: {
          where: {
            deletedAt: null,
            ...(input.employeeIds?.length ? { employeeId: { in: input.employeeIds } } : {}),
          },
          include: { employee: true },
        },
      },
    });
    if (!payroll) throw new NotFoundError("Payroll", input.payrollId);
    if (!["approved", "locked", "calculated"].includes(payroll.status)) {
      throw new BusinessRuleError("Payroll must be calculated or approved for bank transfer");
    }

    const transferRows: BankTransferRow[] = [];
    for (const calc of payroll.payrollCalculations) {
      const bank = await prisma.employeeBankDetail.findFirst({
        where: { companyId, employeeId: calc.employeeId, deletedAt: null, isPrimary: true, status: "active" },
      });
      if (!bank) continue;
      const accountNumber = encryptionService.decrypt(bank.accountNumberEnc, true) ?? "";
      const upiId = bank.upiIdEnc ? encryptionService.decrypt(bank.upiIdEnc, true) ?? undefined : undefined;
      transferRows.push({
        employeeId: calc.employeeId,
        employeeCode: calc.employee.employeeCode,
        beneficiaryName: bank.accountHolderName,
        accountNumber,
        ifscCode: bank.ifscCode,
        bankName: bank.bankName,
        amount: Number(calc.netSalary),
        paymentMode: input.fileFormat === "rtgs" ? "RTGS" : "NEFT",
        upiId,
      });
    }

    const provider = getBankTransferProvider(input.providerCode as BankProviderCode);
    const fileResult = provider.generateFile(
      transferRows,
      input.fileFormat as BankFileFormat,
      input.mappingConfig as never,
    );
    if (fileResult.validationErrors.length) {
      throw new BusinessRuleError(`Bank validation failed: ${fileResult.validationErrors.join("; ")}`);
    }

    const batch = await prisma.bankTransferBatch.create({
      data: {
        companyId,
        payrollId: payroll.id,
        batchNumber: batchNumber(),
        providerCode: input.providerCode as BankProviderCode,
        fileFormat: input.fileFormat as BankFileFormat,
        status: "pending",
        totalAmount: transferRows.reduce((s, r) => s + r.amount, 0),
        recordCount: transferRows.length,
        mappingConfig: input.mappingConfig as object,
        validationLog: fileResult.validationErrors as object,
        generatedBy: actorUserId,
        metadata: { upiReady: true, virtualAccountReady: true } as object,
      },
    });

    await prisma.bankTransferRecord.createMany({
      data: transferRows.map((r) => ({
        companyId,
        batchId: batch.id,
        employeeId: r.employeeId,
        beneficiaryName: r.beneficiaryName,
        accountNumber: r.accountNumber.slice(-4).padStart(r.accountNumber.length, "*"),
        ifscCode: r.ifscCode,
        bankName: r.bankName,
        amount: r.amount,
        paymentMode: r.paymentMode,
        upiId: r.upiId ?? null,
        status: "pending" as BankTransferStatus,
        metadata: { employeeCode: r.employeeCode } as object,
      })),
    });

    const stored = await fileStorageService.store({
      companyId,
      category: "report",
      entityId: batch.id,
      originalName: `${batch.batchNumber}.${fileResult.extension}`,
      mimeType: fileResult.mimeType,
      data: Buffer.from(fileResult.content, "utf-8"),
      actorUserId,
    });

    await prisma.bankTransferBatch.update({
      where: { id: batch.id },
      data: { fileId: stored.id },
    });

    await createPayrollReportingAuditService(companyId).record({
      entityType: "bank_transfer_batch",
      entityId: batch.id,
      action: "bank_file_generated",
      actorUserId,
      metadata: { provider: input.providerCode, recordCount: transferRows.length },
    });

    return { batch, file: stored, recordCount: transferRows.length };
  }

  async approve(batchId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const batch = await prisma.bankTransferBatch.findFirst({ where: { id: batchId, companyId } });
    if (!batch) throw new NotFoundError("Bank transfer batch", batchId);
    const updated = await prisma.bankTransferBatch.update({
      where: { id: batchId },
      data: { status: "processing", approvedBy: actorUserId, approvedAt: new Date() },
    });
    await createPayrollReportingAuditService(companyId).record({
      entityType: "bank_transfer_batch",
      entityId: batchId,
      action: "bank_batch_approved",
      actorUserId,
    });
    return updated;
  }

  async updateRecordStatus(input: z.infer<typeof bankTransferStatusSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const updated = await prisma.bankTransferRecord.update({
      where: { id: input.recordId },
      data: { status: input.status as BankTransferStatus, failureReason: input.failureReason ?? null },
    });
    await createPayrollReportingAuditService(companyId).record({
      entityType: "bank_transfer_record",
      entityId: input.recordId,
      action: "transfer_status_updated",
      actorUserId,
      metadata: { status: input.status },
    });
    return updated;
  }

  async listBatches(payrollId?: string) {
    return prisma.bankTransferBatch.findMany({
      where: { companyId: this.requireCompanyId(), ...(payrollId ? { payrollId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { records: true } } },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createBankTransferService(companyId: string) {
  return new BankTransferService(companyId);
}
