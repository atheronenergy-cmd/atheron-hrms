import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createDocumentArchiveService } from "@/modules/payroll-documents/application/document-archive.service";
import { createDocumentVerificationService } from "@/modules/payroll-documents/application/document-verification.service";
import { pdfGenerationService } from "@/modules/payroll-documents/application/pdf-generation.service";
import { createPayrollDocumentAuditService } from "@/modules/payroll-documents/application/payroll-document-audit.service";
import { createPayrollEmailService } from "@/modules/payroll-documents/application/payroll-email.service";
import { createPayrollExportService } from "@/modules/payroll-documents/application/payroll-export.service";
import { createPayslipService } from "@/modules/payroll-documents/application/payslip.service";
import { createSalaryCertificateService } from "@/modules/payroll-documents/application/salary-certificate.service";
import type { PayrollDocumentDashboardStats, PayrollDocumentReportType } from "@/modules/payroll-documents/domain/types";

export class PayrollDocumentReportService extends BaseRepository {
  async getDashboardStats(): Promise<PayrollDocumentDashboardStats> {
    const companyId = this.requireCompanyId();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalPayslips, generatedThisMonth, pendingGeneration, emailsSent, emailsFailed, archivedDocuments, certificatesIssued] =
      await Promise.all([
        prisma.payslip.count({ where: { companyId } }),
        prisma.payslip.count({ where: { companyId, generatedAt: { gte: monthStart } } }),
        prisma.payrollCalculation.count({
          where: { companyId, deletedAt: null, payslip: null, payroll: { status: { in: ["approved", "locked", "calculated"] } } },
        }),
        prisma.documentDistribution.count({ where: { companyId, status: "sent" } }),
        prisma.documentDistribution.count({ where: { companyId, status: "failed" } }),
        prisma.payrollArchive.count({ where: { companyId } }),
        prisma.salaryCertificate.count({ where: { companyId } }),
      ]);

    return {
      totalPayslips,
      generatedThisMonth,
      pendingGeneration,
      emailsSent,
      emailsFailed,
      archivedDocuments,
      certificatesIssued,
    };
  }

  async buildReport(params: { reportType: PayrollDocumentReportType; periodStart?: string; periodEnd?: string }) {
    const companyId = this.requireCompanyId();
    const dateFilter =
      params.periodStart && params.periodEnd
        ? { gte: new Date(params.periodStart), lte: new Date(params.periodEnd) }
        : undefined;

    switch (params.reportType) {
      case "payslip_generation":
        return prisma.payslip.findMany({
          where: { companyId, ...(dateFilter ? { generatedAt: dateFilter } : {}) },
          orderBy: { generatedAt: "desc" },
        });
      case "email_delivery":
        return prisma.documentDistribution.findMany({
          where: { companyId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
          orderBy: { createdAt: "desc" },
        });
      case "archive":
        return createDocumentArchiveService(companyId).list();
      case "salary_certificate":
        return prisma.salaryCertificate.findMany({
          where: { companyId, ...(dateFilter ? { generatedAt: dateFilter } : {}) },
          orderBy: { generatedAt: "desc" },
        });
      default:
        return [];
    }
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function getPayrollDocumentServices(companyId: string) {
  return {
    payslip: createPayslipService(companyId),
    pdf: pdfGenerationService,
    export: createPayrollExportService(companyId),
    certificate: createSalaryCertificateService(companyId),
    archive: createDocumentArchiveService(companyId),
    verification: createDocumentVerificationService(companyId),
    email: createPayrollEmailService(companyId),
    audit: createPayrollDocumentAuditService(companyId),
    report: new PayrollDocumentReportService(companyId),
  };
}
