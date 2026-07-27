import ExcelJS from "exceljs";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { fileStorageService } from "@/infrastructure/storage/file-storage.service";
import { createDocumentArchiveService } from "@/modules/payroll-documents/application/document-archive.service";
import { createPayrollDocumentAuditService } from "@/modules/payroll-documents/application/payroll-document-audit.service";
import { EXPORT_DOCUMENT_TYPE_MAP } from "@/modules/payroll-documents/domain/types";
import type { payrollExportSchema } from "@/modules/payroll-documents/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class PayrollExportService extends BaseRepository {
  async export(input: z.infer<typeof payrollExportSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({
      where: { id: input.payrollId, companyId, deletedAt: null },
      include: {
        payrollPeriod: true,
        payrollCalculations: {
          where: { deletedAt: null },
          include: {
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
                departmentId: true,
                branchId: true,
                department: { select: { name: true } },
                branch: { select: { name: true } },
              },
            },
            componentValues: true,
          },
        },
      },
    });
    if (!payroll) throw new NotFoundError("Payroll", input.payrollId);

    let rows = payroll.payrollCalculations;
    if (input.departmentId) rows = rows.filter((r) => r.employee.departmentId === input.departmentId);
    if (input.branchId) rows = rows.filter((r) => r.employee.branchId === input.branchId);
    if (input.employeeId) rows = rows.filter((r) => r.employeeId === input.employeeId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(input.exportType.replace(/_/g, " "));
    sheet.columns = [
      { header: "Employee Code", key: "code", width: 16 },
      { header: "Employee Name", key: "name", width: 24 },
      { header: "Department", key: "department", width: 18 },
      { header: "Branch", key: "branch", width: 16 },
      { header: "Gross", key: "gross", width: 14 },
      { header: "Deductions", key: "deductions", width: 14 },
      { header: "Net", key: "net", width: 14 },
      { header: "Paid Days", key: "paidDays", width: 12 },
    ];

    for (const calc of rows) {
      sheet.addRow({
        code: calc.employee.employeeCode,
        name: [calc.employee.firstName, calc.employee.lastName].filter(Boolean).join(" "),
        department: calc.employee.department?.name ?? "",
        branch: calc.employee.branch?.name ?? "",
        gross: Number(calc.grossSalary),
        deductions: Number(calc.totalDeductions),
        net: Number(calc.netSalary),
        paidDays: Number(calc.paidDays),
      });
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const documentNumber = `EXP-${Date.now().toString().slice(-8)}`;
    const stored = await fileStorageService.store({
      companyId,
      category: "report",
      entityId: payroll.id,
      originalName: `${input.exportType}-${payroll.payrollNumber}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: buffer,
      actorUserId,
    });

    const doc = await prisma.payrollDocument.create({
      data: {
        companyId,
        payrollId: payroll.id,
        documentType: EXPORT_DOCUMENT_TYPE_MAP[input.exportType],
        documentNumber,
        title: `${input.exportType.replace(/_/g, " ")} - ${payroll.payrollNumber}`,
        fileId: stored.id,
        hash: stored.storageKey,
        generatedBy: actorUserId,
        metadata: { exportType: input.exportType, rowCount: rows.length } as object,
      },
    });

    await createDocumentArchiveService(companyId).archive({
      payrollId: payroll.id,
      documentId: doc.id,
      archiveType: "excel",
      fileId: stored.id,
      hash: stored.storageKey,
      actorUserId,
    });

    await createPayrollDocumentAuditService(companyId).record({
      entityType: "payroll_document",
      entityId: doc.id,
      action: "payroll_exported",
      actorUserId,
      metadata: { exportType: input.exportType },
    });

    return { document: doc, file: stored };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollExportService(companyId: string) {
  return new PayrollExportService(companyId);
}
