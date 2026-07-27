import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createDocumentArchiveService } from "@/modules/payroll-documents/application/document-archive.service";
import { createDocumentVerificationService } from "@/modules/payroll-documents/application/document-verification.service";
import { createPayrollDocumentAuditService } from "@/modules/payroll-documents/application/payroll-document-audit.service";
import { pdfGenerationService } from "@/modules/payroll-documents/application/pdf-generation.service";
import type { SalaryCertificateRenderData } from "@/modules/payroll-documents/domain/types";
import type { salaryCertificateSchema } from "@/modules/payroll-documents/validation/schemas";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

function documentNumber(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

export class SalaryCertificateService extends BaseRepository {
  async generate(input: z.infer<typeof salaryCertificateSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, companyId, deletedAt: null },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        company: { select: { name: true, legalName: true } },
      },
    });
    if (!employee) throw new NotFoundError("Employee", input.employeeId);

    const salary = await prisma.employeeSalary.findFirst({
      where: { employeeId: employee.id, companyId, deletedAt: null, approvalStatus: "approved" },
      orderBy: { effectiveFrom: "desc" },
    });

    const currentSalary = input.currentSalary ?? Number(salary?.baseSalary ?? 0);
    const grossSalary = input.grossSalary ?? Number(salary?.monthlyCtc ?? currentSalary);
    const docNo = documentNumber("SC");
    const issuedDate = input.issuedDate ?? new Date().toISOString().slice(0, 10);

    const renderData: SalaryCertificateRenderData = {
      documentNumber: docNo,
      companyName: employee.company.legalName ?? employee.company.name,
      employeeName: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
      employeeCode: employee.employeeCode,
      designation: employee.designation.name,
      department: employee.department.name,
      joiningDate: employee.dateOfJoining.toISOString().slice(0, 10),
      currentSalary,
      grossSalary,
      issuedDate,
      authorizedSignatory: input.authorizedSignatory,
    };

    const { buffer, hash } = await pdfGenerationService.renderSalaryCertificatePdf(renderData);
    const stored = await pdfGenerationService.storePdf({
      companyId,
      entityId: employee.id,
      filename: `${docNo}.pdf`,
      buffer,
      actorUserId,
      category: "certificate",
    });

    const verification = await createDocumentVerificationService(companyId).create({
      documentNumber: docNo,
      documentType: "salary_certificate",
      entityType: "salary_certificate",
      entityId: employee.id,
      payload: renderData as unknown as Record<string, unknown>,
    });

    const row = await prisma.salaryCertificate.create({
      data: {
        companyId,
        employeeId: employee.id,
        documentNumber: docNo,
        designation: employee.designation.name,
        department: employee.department.name,
        joiningDate: employee.dateOfJoining,
        currentSalary,
        grossSalary,
        issuedDate: new Date(issuedDate),
        authorizedSignatory: input.authorizedSignatory,
        pdfFileId: stored.id,
        verificationId: verification.id,
        generatedBy: actorUserId,
        metadata: { hash } as object,
      },
    });

    await createDocumentArchiveService(companyId).archive({
      documentId: undefined,
      archiveType: "pdf",
      fileId: stored.id,
      hash,
      actorUserId,
      metadata: { salaryCertificateId: row.id },
    });

    await createPayrollDocumentAuditService(companyId).record({
      entityType: "salary_certificate",
      entityId: row.id,
      action: "salary_certificate_generated",
      actorUserId,
    });

    return row;
  }

  async list(employeeId?: string) {
    return prisma.salaryCertificate.findMany({
      where: {
        companyId: this.requireCompanyId(),
        ...(employeeId ? { employeeId } : {}),
      },
      include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { generatedAt: "desc" },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createSalaryCertificateService(companyId: string) {
  return new SalaryCertificateService(companyId);
}
