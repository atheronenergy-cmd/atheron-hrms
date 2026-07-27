import { emailProvider } from "@/infrastructure/email/email-provider";
import { fileStorageService } from "@/infrastructure/storage/file-storage.service";
import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollDocumentAuditService } from "@/modules/payroll-documents/application/payroll-document-audit.service";
import type { emailDistributionSchema } from "@/modules/payroll-documents/validation/schemas";
import { APP_NAME } from "@/shared/constants/app";
import { NotFoundError } from "@/shared/errors";
import type { z } from "zod";

function payslipEmailBody(params: { employeeName: string; payslipNumber: string; netSalary: number }) {
  return `
Hello ${params.employeeName},

Your payslip ${params.payslipNumber} from ${APP_NAME} is attached to this email.

Net pay: ₹${params.netSalary.toLocaleString("en-IN")}

If you have questions, contact your HR department.

— ${APP_NAME} Team
  `.trim();
}

export class PayrollEmailService extends BaseRepository {
  async queueDistribution(input: z.infer<typeof emailDistributionSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();

    if (input.retryFailed) {
      const failed = await prisma.documentDistribution.findMany({
        where: { companyId, status: { in: ["failed", "retry"] } },
        take: 100,
      });
      const results = [];
      for (const row of failed) {
        results.push(await this.processSend(row.id, actorUserId));
      }
      return { retried: results.length, results };
    }

    const payslips = input.payslipId
      ? [await prisma.payslip.findFirst({ where: { id: input.payslipId, companyId }, include: { employee: true } })]
      : await prisma.payslip.findMany({
          where: {
            companyId,
            payrollId: input.payrollId ?? undefined,
            ...(input.employeeIds?.length ? { employeeId: { in: input.employeeIds } } : {}),
            status: "generated",
          },
          include: { employee: true },
        });

    const rows = [];
    for (const payslip of payslips.filter(Boolean)) {
      if (!payslip) continue;
      const distribution = await prisma.documentDistribution.create({
        data: {
          companyId,
          payslipId: payslip.id,
          employeeId: payslip.employeeId,
          recipientEmail: payslip.employee.email,
          status: "queued",
          createdBy: actorUserId,
        },
      });
      rows.push(await this.processSend(distribution.id, actorUserId));
    }
    return { queued: rows.length, results: rows };
  }

  async processSend(distributionId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const row = await prisma.documentDistribution.findFirst({
      where: { id: distributionId, companyId },
      include: { payslip: { include: { employee: true } }, employee: true },
    });
    if (!row) throw new NotFoundError("Document distribution", distributionId);
    if (!row.recipientEmail) {
      return prisma.documentDistribution.update({
        where: { id: row.id },
        data: {
          status: "failed",
          failedAt: new Date(),
          retryCount: { increment: 1 },
          errorMessage: "Employee email address is missing",
        },
      });
    }

    try {
      const attachments = [];
      if (row.payslip.pdfFileId) {
        const file = await fileStorageService.getDownloadBuffer(row.payslip.pdfFileId, companyId);
        attachments.push({
          filename: file.originalName || `${row.payslip.payslipNumber}.pdf`,
          content: file.buffer,
          contentType: file.mimeType,
        });
      }

      await emailProvider.send(
        row.recipientEmail,
        `Your payslip ${row.payslip.payslipNumber} — ${APP_NAME}`,
        payslipEmailBody({
          employeeName: `${row.employee.firstName} ${row.employee.lastName}`.trim(),
          payslipNumber: row.payslip.payslipNumber,
          netSalary: Number(row.payslip.netSalary),
        }),
        {
          attachments,
          tags: ["payslip"],
        },
      );

      await prisma.activityLog.create({
        data: {
          companyId,
          userId: actorUserId ?? null,
          action: "payslip_email_sent",
          entityType: "document_distribution",
          entityId: row.id,
          metadata: {
            recipientEmail: row.recipientEmail,
            payslipId: row.payslipId,
            channel: "resend",
          } as object,
        },
      });

      const updated = await prisma.documentDistribution.update({
        where: { id: row.id },
        data: { status: "sent", sentAt: new Date(), errorMessage: null },
      });

      await createPayrollDocumentAuditService(companyId).record({
        entityType: "document_distribution",
        entityId: row.id,
        action: "email_sent",
        actorUserId,
        metadata: { recipientEmail: row.recipientEmail },
      });

      return updated;
    } catch (error) {
      return prisma.documentDistribution.update({
        where: { id: row.id },
        data: {
          status: "failed",
          failedAt: new Date(),
          retryCount: { increment: 1 },
          errorMessage: error instanceof Error ? error.message : "Email send failed",
        },
      });
    }
  }

  async listHistory(params?: { status?: string; limit?: number }) {
    return prisma.documentDistribution.findMany({
      where: {
        companyId: this.requireCompanyId(),
        ...(params?.status ? { status: params.status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params?.limit ?? 50,
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollEmailService(companyId: string) {
  return new PayrollEmailService(companyId);
}
