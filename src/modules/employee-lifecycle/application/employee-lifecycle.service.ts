import { prisma } from "@/infrastructure/database/prisma-client";
import { createConfirmationService } from "@/modules/employee-lifecycle/application/confirmation.service";
import { createExitService } from "@/modules/employee-lifecycle/application/exit.service";
import { createJoiningService } from "@/modules/employee-lifecycle/application/joining.service";
import { createProbationService } from "@/modules/employee-lifecycle/application/probation.service";
import { createPromotionService } from "@/modules/employee-lifecycle/application/promotion.service";
import { createResignationService } from "@/modules/employee-lifecycle/application/resignation.service";
import { createSalaryRevisionService } from "@/modules/employee-lifecycle/application/salary-revision.service";
import { createSuspensionService } from "@/modules/employee-lifecycle/application/suspension.service";
import { createTransferService } from "@/modules/employee-lifecycle/application/transfer.service";
import { createWarningService } from "@/modules/employee-lifecycle/application/warning.service";
import { createWorkflowService } from "@/modules/employee-lifecycle/application/workflow.service";
import { createFinalSettlementRecoveryService } from "@/modules/loan-recovery/application/final-settlement-recovery.service";
import type { EmployeeLifecycleSummary, JourneyEventItem } from "@/modules/employee-lifecycle/domain/types";

export class EmployeeLifecycleModuleService {
  constructor(private readonly companyId: string) {}

  async getSummary(employeeId: string): Promise<EmployeeLifecycleSummary> {
    const joining = createJoiningService(this.companyId);
    const probation = createProbationService(this.companyId);
    const confirmation = createConfirmationService(this.companyId);
    const transfer = createTransferService(this.companyId);
    const promotion = createPromotionService(this.companyId);
    const salary = createSalaryRevisionService(this.companyId);
    const warning = createWarningService(this.companyId);
    const suspension = createSuspensionService(this.companyId);
    const resignation = createResignationService(this.companyId);
    const exit = createExitService(this.companyId);
    const workflow = createWorkflowService(this.companyId);

    const journeyEvents = await this.listJourneyEvents(employeeId);
    const notifications = await prisma.lifecycleNotification.findMany({
      where: { companyId: this.companyId, employeeId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const [
      joiningRecord,
      probations,
      confirmations,
      transfers,
      promotions,
      salaryRevisions,
      warnings,
      suspensions,
      resignations,
      exitClearance,
      terminations,
      alumni,
      pendingWorkflows,
    ] = await Promise.all([
      joining.getByEmployee(employeeId),
      probation.listByEmployee(employeeId),
      confirmation.listByEmployee(employeeId),
      transfer.listByEmployee(employeeId),
      promotion.listByEmployee(employeeId),
      salary.listByEmployee(employeeId),
      warning.listByEmployee(employeeId),
      suspension.listByEmployee(employeeId),
      resignation.listByEmployee(employeeId),
      exit.getClearance(employeeId),
      exit.listTerminations(employeeId),
      exit.getAlumni(employeeId),
      workflow.listPending(employeeId),
    ]);

    const settlementRecovery =
      exitClearance || resignations.length > 0 || terminations.length > 0
        ? await createFinalSettlementRecoveryService(this.companyId).getRecoverySummary(employeeId)
        : null;

    return {
      joining: joiningRecord,
      probations,
      confirmations,
      transfers,
      promotions,
      salaryRevisions,
      warnings,
      suspensions,
      resignations,
      exitClearance,
      settlementRecovery,
      terminations,
      alumni,
      journeyEvents,
      pendingWorkflows,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        dueDate: n.dueDate?.toISOString() ?? null,
      })),
    };
  }

  async listJourneyEvents(employeeId: string): Promise<JourneyEventItem[]> {
    const rows = await prisma.employeeJourneyEvent.findMany({
      where: { companyId: this.companyId, employeeId, deletedAt: null },
      orderBy: { eventDate: "desc" },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      stage: r.stage,
      eventType: r.eventType,
      title: r.title,
      description: r.description,
      eventDate: r.eventDate.toISOString(),
    }));
  }
}

export function createEmployeeLifecycleModuleService(companyId: string) {
  return new EmployeeLifecycleModuleService(companyId);
}

export function getLifecycleServices(companyId: string) {
  return {
    lifecycle: createEmployeeLifecycleModuleService(companyId),
    joining: createJoiningService(companyId),
    probation: createProbationService(companyId),
    confirmation: createConfirmationService(companyId),
    transfer: createTransferService(companyId),
    promotion: createPromotionService(companyId),
    salaryRevision: createSalaryRevisionService(companyId),
    warning: createWarningService(companyId),
    suspension: createSuspensionService(companyId),
    resignation: createResignationService(companyId),
    exit: createExitService(companyId),
    workflow: createWorkflowService(companyId),
  };
}
