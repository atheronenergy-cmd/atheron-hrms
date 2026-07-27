import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import { DEFAULT_APPROVAL_WORKFLOW } from "@/modules/payroll-governance/domain/types";
import type { approvalActionSchema } from "@/modules/payroll-governance/validation/schemas";
import { BusinessRuleError, NotFoundError } from "@/shared/errors";
import type { z } from "zod";

export class PayrollApprovalService extends BaseRepository {
  private audit = createPayrollGovernanceAuditService(this.companyId ?? "");

  async getQueue() {
    return prisma.payrollApproval.findMany({
      where: { companyId: this.requireCompanyId(), status: { in: ["pending", "in_progress"] } },
      include: {
        payroll: { select: { payrollNumber: true, status: true, totalNet: true, employeeCount: true } },
        steps: { orderBy: { stepNumber: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getHistory(payrollId?: string) {
    return prisma.payrollApproval.findMany({
      where: {
        companyId: this.requireCompanyId(),
        ...(payrollId ? { payrollId } : {}),
      },
      include: { steps: { orderBy: { stepNumber: "asc" } }, payroll: { select: { payrollNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: payrollId ? 50 : 25,
    });
  }

  async submit(payrollId: string, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    const payroll = await prisma.payroll.findFirst({ where: { id: payrollId, companyId, deletedAt: null } });
    if (!payroll) throw new NotFoundError("Payroll", payrollId);
    if (!["calculated", "review"].includes(payroll.status)) {
      throw new BusinessRuleError("Only calculated payrolls can be submitted for approval");
    }

    const existing = await prisma.payrollApproval.findFirst({
      where: { payrollId, companyId, status: { in: ["pending", "in_progress"] } },
    });
    if (existing) throw new BusinessRuleError("Approval workflow already in progress");

    const approval = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollApproval.create({
        data: {
          companyId,
          payrollId,
          status: "in_progress",
          submittedBy: actorUserId,
          submittedAt: new Date(),
          totalSteps: DEFAULT_APPROVAL_WORKFLOW.length,
          currentStep: 1,
          steps: {
            create: DEFAULT_APPROVAL_WORKFLOW.map((s) => ({
              companyId,
              stepNumber: s.stepNumber,
              stepRole: s.stepRole,
              stepLabel: s.stepLabel,
              status: s.stepNumber === 1 ? "in_progress" : "pending",
            })),
          },
        },
        include: { steps: true },
      });
      await tx.payroll.update({
        where: { id: payrollId },
        data: { status: "pending_approval", updatedBy: actorUserId, version: { increment: 1 } },
      });
      return created;
    });

    await this.audit.record({ entityType: "payroll_approval", entityId: approval.id, action: "approval_submitted", actorUserId, metadata: { payrollId } });
    return approval;
  }

  async processAction(input: z.infer<typeof approvalActionSchema>, actorUserId?: string) {
    const companyId = this.requireCompanyId();
    if (input.action === "submit") return this.submit(input.payrollId, actorUserId);

    const approval = await prisma.payrollApproval.findFirst({
      where: { payrollId: input.payrollId, companyId, status: { in: ["pending", "in_progress"] } },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });
    if (!approval) throw new NotFoundError("Payroll approval workflow", input.payrollId);

    const currentStep = approval.steps.find((s) => s.stepNumber === approval.currentStep);
    if (!currentStep) throw new BusinessRuleError("Invalid approval step");

    switch (input.action) {
      case "approve":
        await prisma.payrollApprovalStep.update({
          where: { id: currentStep.id },
          data: { status: "approved", action: "approve", approverUserId: actorUserId, actedAt: new Date(), comments: input.comments ?? null },
        });
        if (approval.currentStep >= approval.totalSteps) {
          await prisma.$transaction([
            prisma.payrollApproval.update({
              where: { id: approval.id },
              data: { status: "approved", completedAt: new Date(), currentStep: approval.totalSteps },
            }),
            prisma.payroll.update({
              where: { id: input.payrollId },
              data: { status: "approved", approvedBy: actorUserId, approvedAt: new Date(), updatedBy: actorUserId, version: { increment: 1 } },
            }),
          ]);
          await this.audit.record({ entityType: "payroll_approval", entityId: approval.id, action: "approval_completed", actorUserId });
        } else {
          const nextStep = approval.currentStep + 1;
          await prisma.$transaction([
            prisma.payrollApproval.update({ where: { id: approval.id }, data: { currentStep: nextStep } }),
            prisma.payrollApprovalStep.updateMany({
              where: { payrollApprovalId: approval.id, stepNumber: nextStep },
              data: { status: "in_progress" },
            }),
          ]);
          await this.audit.record({ entityType: "payroll_approval", entityId: approval.id, action: "approval_step_approved", actorUserId, metadata: { step: approval.currentStep } });
        }
        break;
      case "reject":
        await prisma.$transaction([
          prisma.payrollApprovalStep.update({
            where: { id: currentStep.id },
            data: { status: "rejected", action: "reject", approverUserId: actorUserId, actedAt: new Date(), comments: input.comments ?? null },
          }),
          prisma.payrollApproval.update({ where: { id: approval.id }, data: { status: "rejected", completedAt: new Date() } }),
          prisma.payroll.update({ where: { id: input.payrollId }, data: { status: "calculated", updatedBy: actorUserId, version: { increment: 1 } } }),
        ]);
        await this.audit.record({ entityType: "payroll_approval", entityId: approval.id, action: "approval_rejected", actorUserId });
        break;
      case "send_back":
        await prisma.payrollApprovalStep.update({
          where: { id: currentStep.id },
          data: { status: "sent_back", action: "send_back", approverUserId: actorUserId, actedAt: new Date(), comments: input.comments ?? null },
        });
        await prisma.payroll.update({ where: { id: input.payrollId }, data: { status: "calculated", updatedBy: actorUserId, version: { increment: 1 } } });
        await this.audit.record({ entityType: "payroll_approval", entityId: approval.id, action: "approval_sent_back", actorUserId });
        break;
      case "delegate":
        if (!input.delegateToUserId) throw new BusinessRuleError("Delegate user required");
        await prisma.payrollApprovalStep.update({
          where: { id: currentStep.id },
          data: { status: "delegated", action: "delegate", delegatedToUserId: input.delegateToUserId, comments: input.comments ?? null },
        });
        await this.audit.record({ entityType: "payroll_approval", entityId: approval.id, action: "approval_delegated", actorUserId, metadata: { delegateTo: input.delegateToUserId } });
        break;
      case "escalate": {
        const nextStep = Math.min(approval.currentStep + 1, approval.totalSteps);
        await prisma.$transaction([
          prisma.payrollApprovalStep.update({
            where: { id: currentStep.id },
            data: { status: "escalated", action: "escalate", approverUserId: actorUserId, actedAt: new Date(), comments: input.comments ?? null },
          }),
          prisma.payrollApproval.update({ where: { id: approval.id }, data: { currentStep: nextStep } }),
          prisma.payrollApprovalStep.updateMany({
            where: { payrollApprovalId: approval.id, stepNumber: nextStep },
            data: { status: "in_progress" },
          }),
        ]);
        await this.audit.record({ entityType: "payroll_approval", entityId: approval.id, action: "approval_escalated", actorUserId });
        break;
      }
    }

    return prisma.payrollApproval.findFirst({
      where: { id: approval.id },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollApprovalService(companyId: string) {
  return new PayrollApprovalService(companyId);
}
