import type { PayslipPasswordRule } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { fileStorageService } from "@/infrastructure/storage/file-storage.service";
import { createDocumentArchiveService } from "@/modules/payroll-documents/application/document-archive.service";
import { createDocumentVerificationService } from "@/modules/payroll-documents/application/document-verification.service";
import { createPayrollDocumentAuditService } from "@/modules/payroll-documents/application/payroll-document-audit.service";
import { hashPassword, generatePayslipPassword, verifyPassword } from "@/modules/payroll-documents/application/payslip-password.service";
import { pdfGenerationService } from "@/modules/payroll-documents/application/pdf-generation.service";
import type { PayslipRenderData } from "@/modules/payroll-documents/domain/types";
import type { payslipBulkGenerateSchema, payslipGenerateSchema } from "@/modules/payroll-documents/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

function docNumber(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`;
}

export class PayslipService extends BaseRepository {
  async list(params?: { employeeId?: string; payrollId?: string; year?: number; month?: number }) {
    const companyId = this.requireCompanyId();
    return prisma.payslip.findMany({
      where: {
        companyId,
        ...(params?.employeeId ? { employeeId: params.employeeId } : {}),
        ...(params?.payrollId ? { payrollId: params.payrollId } : {}),
      },
      include: {
        employee: { select: { employeeCode: true, firstName: true, lastName: true } },
        payroll: { select: { payrollNumber: true, payrollPeriod: { select: { name: true, payrollMonth: true, payrollYear: true } } } },
      },
      orderBy: { generatedAt: "desc" },
    });
  }

  async getById(id: string) {
    const row = await prisma.payslip.findFirst({
      where: { id, companyId: this.requireCompanyId() },
      include: { versions: { orderBy: { versionNumber: "desc" } }, employee: true, payroll: { include: { payrollPeriod: true } } },
    });
    if (!row) throw new NotFoundError("Payslip", id);
    return row;
  }

  async buildRenderData(calculationId: string): Promise<PayslipRenderData> {
    const companyId = this.requireCompanyId();
    const calc = await prisma.payrollCalculation.findFirst({
      where: { id: calculationId, companyId, deletedAt: null },
      include: {
        employee: {
          include: {
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
        componentValues: { orderBy: { sortOrder: "asc" } },
        payroll: { include: { payrollPeriod: true, company: true } },
        employerContribution: true,
      },
    });
    if (!calc) throw new NotFoundError("Payroll calculation", calculationId);

    const company = calc.payroll.company;
    const earnings = calc.componentValues
      .filter((c) => c.componentType === "earning")
      .map((c) => ({ code: c.componentCode, name: c.componentName, amount: Number(c.amount) }));
    const deductions = calc.componentValues
      .filter((c) => c.componentType === "deduction" && !c.isEmployerContribution)
      .map((c) => ({ code: c.componentCode, name: c.componentName, amount: Number(c.amount) }));
    const employerContributions = calc.componentValues
      .filter((c) => c.isEmployerContribution)
      .map((c) => ({ code: c.componentCode, name: c.componentName, amount: Number(c.amount) }));

    if (calc.employerContribution) {
      const ec = calc.employerContribution;
      employerContributions.push(
        { code: "PF_EMPLOYER", name: "PF Employer", amount: Number(ec.pfEmployer) },
        { code: "ESI_EMPLOYER", name: "ESI Employer", amount: Number(ec.esiEmployer) },
      );
    }

    const bankDetails = calc.employee.bankDetails as Record<string, unknown>;
    const paymentMode = typeof bankDetails?.paymentMode === "string" ? bankDetails.paymentMode : "Bank Transfer";

    return {
      documentNumber: docNumber("PS"),
      payslipNumber: docNumber("PAY"),
      company: {
        name: company.name,
        legalName: company.legalName,
        address: company.address as Record<string, unknown>,
        email: company.email,
        phone: company.phone,
        gstNumber: company.gstNumber,
        panNumber: company.panNumber,
      },
      employee: {
        code: calc.employee.employeeCode,
        name: [calc.employee.firstName, calc.employee.lastName].filter(Boolean).join(" "),
        designation: calc.employee.designation.name,
        department: calc.employee.department.name,
        joiningDate: calc.employee.dateOfJoining.toISOString().slice(0, 10),
        bankDetails,
      },
      period: {
        name: calc.payroll.payrollPeriod?.name ?? calc.payroll.payrollNumber,
        startDate: calc.payroll.payrollPeriod?.startDate.toISOString().slice(0, 10) ?? "",
        endDate: calc.payroll.payrollPeriod?.endDate.toISOString().slice(0, 10) ?? "",
        payDate: calc.payroll.payrollPeriod?.payDate?.toISOString().slice(0, 10) ?? null,
      },
      workingDays: Number(calc.workingDays),
      paidDays: Number(calc.paidDays),
      attendanceSummary: calc.attendanceSummary as Record<string, unknown>,
      leaveSummary: calc.leaveSummary as Record<string, unknown>,
      earnings,
      deductions,
      employerContributions: employerContributions.filter((e) => e.amount > 0),
      grossSalary: Number(calc.grossSalary),
      totalDeductions: Number(calc.totalDeductions),
      netSalary: Number(calc.netSalary),
      paymentMode,
      generatedAt: new Date().toISOString(),
    };
  }

  async generate(input: z.infer<typeof payslipGenerateSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({
      where: { id: input.payrollId, companyId, deletedAt: null },
      include: {
        payrollCalculations: {
          where: {
            deletedAt: null,
            ...(input.employeeIds?.length ? { employeeId: { in: input.employeeIds } } : {}),
          },
        },
      },
    });
    if (!payroll) throw new NotFoundError("Payroll", input.payrollId);
    if (!["approved", "locked", "calculated"].includes(payroll.status)) {
      throw new BusinessRuleError("Payroll must be calculated or approved before payslip generation");
    }

    const passwordRule = (input.passwordRule ?? "employee_id_dob") as PayslipPasswordRule;
    const results = [];

    for (const calc of payroll.payrollCalculations) {
      const existing = await prisma.payslip.findUnique({ where: { payrollCalculationId: calc.id } });
      if (existing && !input.regenerate) {
        results.push(existing);
        continue;
      }

      const renderData = await this.buildRenderData(calc.id);
      const employee = await prisma.employee.findFirst({ where: { id: calc.employeeId } });
      if (!employee) continue;

      const verification = await createDocumentVerificationService(companyId).create({
        documentNumber: renderData.documentNumber,
        documentType: "payslip",
        entityType: "payslip",
        entityId: calc.id,
        payload: { netSalary: renderData.netSalary, employeeCode: renderData.employee.code },
      });
      renderData.documentNumber = verification.documentNumber;
      renderData.verificationHash = verification.verificationHash;
      renderData.qrCodeDataUrl = verification.qrCodeData;

      const { buffer, hash } = await pdfGenerationService.renderPayslipPdf(renderData);
      const stored = await pdfGenerationService.storePdf({
        companyId,
        entityId: calc.employeeId,
        filename: `${renderData.payslipNumber}.pdf`,
        buffer,
        actorUserId,
        metadata: { passwordProtected: passwordRule !== "none", passwordRule },
      });

      const password = generatePayslipPassword(passwordRule, {
        employeeCode: employee.employeeCode,
        dateOfBirth: employee.dateOfBirth,
        phone: employee.phone,
      });
      const passwordHash = password ? hashPassword(password) : null;
      const versionNumber = existing ? existing.versionNumber + 1 : 1;

      const payslip = existing
        ? await prisma.payslip.update({
            where: { id: existing.id },
            data: {
              versionNumber,
              payrollVersion: payroll.calculationVersion,
              status: "generated",
              grossSalary: renderData.grossSalary,
              totalDeductions: renderData.totalDeductions,
              netSalary: renderData.netSalary,
              workingDays: renderData.workingDays,
              paidDays: renderData.paidDays,
              attendanceSummary: renderData.attendanceSummary as object,
              leaveSummary: renderData.leaveSummary as object,
              earnings: renderData.earnings as object,
              deductions: renderData.deductions as object,
              employerContributions: renderData.employerContributions as object,
              paymentMode: renderData.paymentMode,
              pdfFileId: stored.id,
              verificationHash: verification.verificationHash,
              passwordRule,
              generatedAt: new Date(),
              generatedBy: actorUserId,
              version: { increment: 1 },
            },
          })
        : await prisma.payslip.create({
            data: {
              companyId,
              payrollId: payroll.id,
              payrollCalculationId: calc.id,
              employeeId: calc.employeeId,
              documentNumber: verification.documentNumber,
              payslipNumber: renderData.payslipNumber,
              versionNumber,
              payrollVersion: payroll.calculationVersion,
              status: "generated",
              grossSalary: renderData.grossSalary,
              totalDeductions: renderData.totalDeductions,
              netSalary: renderData.netSalary,
              workingDays: renderData.workingDays,
              paidDays: renderData.paidDays,
              attendanceSummary: renderData.attendanceSummary as object,
              leaveSummary: renderData.leaveSummary as object,
              earnings: renderData.earnings as object,
              deductions: renderData.deductions as object,
              employerContributions: renderData.employerContributions as object,
              paymentMode: renderData.paymentMode,
              pdfFileId: stored.id,
              verificationHash: verification.verificationHash,
              passwordRule,
              generatedAt: new Date(),
              generatedBy: actorUserId,
            },
          });

      await prisma.payslipVersion.create({
        data: {
          companyId,
          payslipId: payslip.id,
          versionNumber,
          payrollVersion: payroll.calculationVersion,
          revisionReason: input.revisionReason ?? (input.regenerate ? "Regenerated payslip" : "Initial generation"),
          pdfFileId: stored.id,
          hash,
          passwordRule,
          passwordHash,
          generatedBy: actorUserId,
          metadata: { documentNumber: verification.documentNumber } as object,
        },
      });

      await prisma.payrollItem.upsert({
        where: { payrollId_employeeId: { payrollId: payroll.id, employeeId: calc.employeeId } },
        create: {
          payrollId: payroll.id,
          employeeId: calc.employeeId,
          payslipNumber: renderData.payslipNumber,
          grossEarnings: renderData.grossSalary,
          totalDeductions: renderData.totalDeductions,
          netPay: renderData.netSalary,
          earningsBreakdown: renderData.earnings as object,
          deductionsBreakdown: renderData.deductions as object,
          payslipFileId: stored.id,
          status: "approved",
        },
        update: {
          payslipNumber: renderData.payslipNumber,
          grossEarnings: renderData.grossSalary,
          totalDeductions: renderData.totalDeductions,
          netPay: renderData.netSalary,
          earningsBreakdown: renderData.earnings as object,
          deductionsBreakdown: renderData.deductions as object,
          payslipFileId: stored.id,
          status: "approved",
        },
      });

      await createDocumentArchiveService(companyId).archive({
        payrollId: payroll.id,
        payslipId: payslip.id,
        archiveType: "pdf",
        fileId: stored.id,
        hash,
        versionNumber,
        actorUserId,
      });

      await createPayrollDocumentAuditService(companyId).record({
        entityType: "payslip",
        entityId: payslip.id,
        action: input.regenerate ? "payslip_regenerated" : "payslip_generated",
        actorUserId,
        metadata: { payslipNumber: renderData.payslipNumber, versionNumber },
      });

      results.push(payslip);
    }

    return results;
  }

  async generateBulk(input: z.infer<typeof payslipBulkGenerateSchema>, actorUserId?: string) {
    const payslips = await this.generate(
      {
        payrollId: input.payrollId,
        passwordRule: input.passwordRule,
        regenerate: false,
      },
      actorUserId,
    );

    if (!input.mergePdf || payslips.length === 0) return { payslips, merged: null };

    const renderItems: PayslipRenderData[] = [];
    for (const p of payslips) {
      renderItems.push(await this.buildRenderData(p.payrollCalculationId));
    }
    const { buffer, hash } = await pdfGenerationService.renderMergedPayslips(renderItems);
    const stored = await pdfGenerationService.storePdf({
      companyId: this.requireCompanyId(),
      entityId: input.payrollId,
      filename: `merged-payslips-${input.payrollId}.pdf`,
      buffer,
      actorUserId,
      metadata: { merged: true, count: payslips.length },
    });

    const doc = await prisma.payrollDocument.create({
      data: {
        companyId: this.requireCompanyId(),
        payrollId: input.payrollId,
        documentType: "merged_payslips",
        documentNumber: docNumber("MPDF"),
        title: `Merged Payslips`,
        fileId: stored.id,
        hash,
        generatedBy: actorUserId,
        metadata: { count: payslips.length } as object,
      },
    });

    return { payslips, merged: doc };
  }

  async download(payslipId: string, actorUserId?: string, password?: string) {
    const payslip = await this.getById(payslipId);
    const latestVersion = payslip.versions[0];
    if (payslip.passwordRule !== "none" && latestVersion?.passwordHash) {
      if (!password || !verifyPassword(password, latestVersion.passwordHash)) {
        throw new BusinessRuleError("Invalid payslip password");
      }
    }
    if (!payslip.pdfFileId) throw new BusinessRuleError("Payslip PDF not available");

    await createPayrollDocumentAuditService(this.requireCompanyId()).record({
      entityType: "payslip",
      entityId: payslip.id,
      action: "payslip_downloaded",
      actorUserId,
    });

    return fileStorageService.getDownloadBuffer(payslip.pdfFileId, this.requireCompanyId());
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayslipService(companyId: string) {
  return new PayslipService(companyId);
}
