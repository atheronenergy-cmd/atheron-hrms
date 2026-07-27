import type { ApproverRole, WorkflowActionType, WorkflowStatus } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { ConflictError, NotFoundError } from "@/shared/errors";

type CreateWorkflowInput = {
  employeeId: string;
  entityType: string;
  entityId: string;
  title: string;
  steps: Array<{ approverRole: ApproverRole }>;
  actorUserId: string;
};

export class WorkflowService extends BaseRepository {
  async create(input: CreateWorkflowInput) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    return prisma.workflowRequest.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        status: "draft",
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
        steps: {
          create: input.steps.map((step, index) => ({
            stepOrder: index + 1,
            approverRole: step.approverRole,
            status: "submitted",
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
  }

  async submit(workflowId: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const workflow = await this.getWorkflow(workflowId, companyId);

    if (workflow.status !== "draft" && workflow.status !== "rejected") {
      throw new ConflictError("Workflow cannot be submitted in current status.");
    }

    return prisma.workflowRequest.update({
      where: { id: workflowId, version },
      data: {
        status: "submitted",
        currentStep: 1,
        submittedBy: actorUserId,
        submittedAt: new Date(),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
  }

  async act(params: {
    workflowId: string;
    version: number;
    action: WorkflowActionType;
    actorUserId: string;
    comments?: string;
  }) {
    const companyId = this.requireCompanyId();
    const workflow = await this.getWorkflow(params.workflowId, companyId);

    if (params.action === "cancel") {
      return prisma.workflowRequest.update({
        where: { id: params.workflowId, version: params.version },
        data: {
          status: "cancelled",
          completedAt: new Date(),
          updatedBy: params.actorUserId,
          version: { increment: 1 },
        },
      });
    }

    const currentStep = workflow.steps.find((s) => s.stepOrder === workflow.currentStep);
    if (!currentStep) throw new ConflictError("No pending approval step.");

    const stepStatus = this.mapActionToStatus(params.action);
    await prisma.workflowApprovalStep.update({
      where: { id: currentStep.id },
      data: {
        status: stepStatus,
        actionType: params.action,
        approverUserId: params.actorUserId,
        comments: params.comments ?? null,
        actedAt: new Date(),
      },
    });

    if (params.action === "reject") {
      return prisma.workflowRequest.update({
        where: { id: params.workflowId, version: params.version },
        data: {
          status: "rejected",
          completedAt: new Date(),
          updatedBy: params.actorUserId,
          version: { increment: 1 },
        },
      });
    }

    const nextStep = workflow.currentStep + 1;
    const hasNext = workflow.steps.some((s) => s.stepOrder === nextStep);
    const finalStatus: WorkflowStatus = hasNext ? "under_review" : "approved";

    return prisma.workflowRequest.update({
      where: { id: params.workflowId, version: params.version },
      data: {
        status: finalStatus,
        currentStep: hasNext ? nextStep : workflow.currentStep,
        completedAt: hasNext ? null : new Date(),
        updatedBy: params.actorUserId,
        version: { increment: 1 },
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
  }

  async listPending(employeeId: string) {
    const companyId = this.requireCompanyId();
    const rows = await prisma.workflowRequest.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        status: { in: ["submitted", "under_review"] },
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      title: r.title,
      status: r.status,
      currentStep: r.currentStep,
      steps: r.steps.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        approverRole: s.approverRole,
        status: s.status,
        comments: s.comments,
        actedAt: s.actedAt?.toISOString() ?? null,
      })),
    }));
  }

  private mapActionToStatus(action: WorkflowActionType): WorkflowStatus {
    switch (action) {
      case "approve":
        return "approved";
      case "reject":
        return "rejected";
      case "review":
        return "under_review";
      default:
        return "submitted";
    }
  }

  private async getWorkflow(id: string, companyId: string) {
    const row = await prisma.workflowRequest.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    if (!row) throw new NotFoundError("Workflow", id);
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

export function createWorkflowService(companyId: string) {
  return new WorkflowService(companyId);
}
