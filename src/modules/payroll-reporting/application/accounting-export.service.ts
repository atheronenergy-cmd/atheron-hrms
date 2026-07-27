import type { AccountingProviderCode } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { fileStorageService } from "@/infrastructure/storage/file-storage.service";
import { getAccountingProvider } from "@/modules/payroll-reporting/application/accounting-providers/index";
import { createJournalEntryService } from "@/modules/payroll-reporting/application/journal-entry.service";
import { createPayrollReportingAuditService } from "@/modules/payroll-reporting/application/payroll-reporting-audit.service";
import type { accountingExportSchema } from "@/modules/payroll-reporting/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class AccountingExportService extends BaseRepository {
  async export(input: z.infer<typeof accountingExportSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({ where: { id: input.payrollId, companyId, deletedAt: null } });
    if (!payroll) throw new NotFoundError("Payroll", input.payrollId);

    const journal = input.generateJournal
      ? await createJournalEntryService(companyId).generateFromPayroll(input.payrollId, actorUserId)
      : (await createJournalEntryService(companyId).list(input.payrollId))[0];
    if (!journal) throw new Error("Journal entry required for accounting export");

    const provider = getAccountingProvider(input.providerCode as AccountingProviderCode);
    const fileResult = provider.generateExport(
      journal.lines.map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debitAmount: Number(l.debitAmount),
        creditAmount: Number(l.creditAmount),
        costCenterCode: l.costCenterCode ?? undefined,
      })),
      input.mappingConfig as never,
    );

    const exportNumber = `ACC-${Date.now().toString().slice(-8)}`;
    const stored = await fileStorageService.store({
      companyId,
      category: "report",
      entityId: payroll.id,
      originalName: `${exportNumber}.${fileResult.extension}`,
      mimeType: fileResult.mimeType,
      data: Buffer.from(fileResult.content, "utf-8"),
      actorUserId,
    });

    const row = await prisma.accountingExport.create({
      data: {
        companyId,
        payrollId: payroll.id,
        providerCode: input.providerCode as AccountingProviderCode,
        exportNumber,
        fileId: stored.id,
        mappingConfig: input.mappingConfig as object,
        summary: fileResult.summary as object,
        generatedBy: actorUserId,
      },
    });

    await prisma.journalEntry.update({
      where: { id: journal.id },
      data: { accountingExportId: row.id, status: "exported" },
    });

    await createPayrollReportingAuditService(companyId).record({
      entityType: "accounting_export",
      entityId: row.id,
      action: "accounting_export_created",
      actorUserId,
      metadata: { provider: input.providerCode },
    });

    return { export: row, file: stored, journal };
  }

  async list(payrollId?: string) {
    return prisma.accountingExport.findMany({
      where: { companyId: this.requireCompanyId(), ...(payrollId ? { payrollId } : {}) },
      orderBy: { generatedAt: "desc" },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createAccountingExportService(companyId: string) {
  return new AccountingExportService(companyId);
}
