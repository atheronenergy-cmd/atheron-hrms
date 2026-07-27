import { getPayrollGovernanceServices } from "@/modules/payroll-governance/application/payroll-governance.service";
import {
  approvalActionSchema,
  arrearSchema,
  backupRestoreSchema,
  backupSchema,
  complianceSnapshotSchema,
  financialYearActionSchema,
  financialYearSchema,
  governanceReportSchema,
  payrollLockSchema,
  payrollReopenSchema,
  payrollUnlockSchema,
  retroPayrollSchema,
  rollbackSchema,
  snapshotSchema,
} from "@/modules/payroll-governance/validation/schemas";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function GET(request: Request) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.PAYROLL.VIEW);
    const { searchParams } = new URL(request.url);
    const svc = getPayrollGovernanceServices(auth.companyId);
    const entity = searchParams.get("entity");

    if (entity === "approval-queue") return apiSuccess(await svc.approval.getQueue());
    if (entity === "approval-history") return apiSuccess(await svc.approval.getHistory(searchParams.get("payrollId") ?? undefined));
    if (entity === "locks") return apiSuccess(await svc.lock.listActive());
    if (entity === "reopen-logs") return apiSuccess(await svc.lock.getReopenHistory(searchParams.get("payrollId") ?? undefined));
    if (entity === "versions") {
      const payrollId = searchParams.get("payrollId");
      if (!payrollId) return apiError("payrollId required", 422);
      return apiSuccess(await svc.version.list(payrollId));
    }
    if (entity === "snapshots") {
      const payrollId = searchParams.get("payrollId");
      if (!payrollId) return apiError("payrollId required", 422);
      return apiSuccess(await svc.snapshot.list(payrollId));
    }
    if (entity === "retro") return apiSuccess(await svc.retro.list(searchParams.get("status") ?? undefined));
    if (entity === "arrears") return apiSuccess(await svc.arrear.list(searchParams.get("status") ?? undefined));
    if (entity === "financial-years") return apiSuccess(await svc.financialYear.list());
    if (entity === "compliance") return apiSuccess(await svc.compliance.list(searchParams.get("payrollId") ?? undefined));
    if (entity === "backups") return apiSuccess(await svc.backup.list(searchParams.get("payrollId") ?? undefined));
    if (entity === "audit") return apiSuccess(await svc.audit.listRecent(10));

    const reportType = searchParams.get("reportType");
    if (reportType) {
      const parsed = governanceReportSchema.safeParse({
        reportType,
        payrollId: searchParams.get("payrollId") ?? undefined,
        payrollYearId: searchParams.get("payrollYearId") ?? undefined,
      });
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await svc.report.generate(parsed.data));
    }

    const [queue, locks, audit] = await Promise.all([svc.approval.getQueue(), svc.lock.listActive(), svc.audit.listRecent(5)]);
    return apiSuccess({ pendingApprovals: queue.length, activeLocks: locks.length, audit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "approval") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.APPROVE);
      const parsed = approvalActionSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).approval.processAction(parsed.data, auth.userId));
    }

    if (action === "lock") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.LOCK);
      const parsed = payrollLockSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).lock.lock(parsed.data, auth.userId));
    }

    if (action === "unlock") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.UNLOCK);
      const parsed = payrollUnlockSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).lock.unlock(parsed.data, auth.userId));
    }

    if (action === "reopen") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.UNLOCK);
      const parsed = payrollReopenSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).lock.reopen(parsed.data, auth.userId));
    }

    if (action === "snapshot") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.VIEW);
      const parsed = snapshotSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).snapshot.create(parsed.data, auth.userId));
    }

    if (action === "rollback") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.ROLLBACK);
      const parsed = rollbackSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).version.rollback(parsed.data, auth.userId));
    }

    if (action === "retro") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.RETRO.MANAGE);
      const parsed = retroPayrollSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).retro.create(parsed.data, auth.userId));
    }

    if (action === "arrear") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.ARREAR.MANAGE);
      const parsed = arrearSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).arrear.create(parsed.data, auth.userId));
    }

    if (action === "financial_year") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.YEAR.CLOSE);
      if (body.subAction === "create") {
        const parsed = financialYearSchema.safeParse(body);
        if (!parsed.success) return apiError("Validation failed", 422);
        return apiSuccess(await getPayrollGovernanceServices(auth.companyId).financialYear.create(parsed.data, auth.userId));
      }
      const parsed = financialYearActionSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).financialYear.processAction(parsed.data, auth.userId));
    }

    if (action === "compliance_snapshot") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.VIEW);
      const parsed = complianceSnapshotSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).compliance.capture(parsed.data, auth.userId));
    }

    if (action === "backup") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.BACKUP.MANAGE);
      const parsed = backupSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).backup.create(parsed.data, auth.userId));
    }

    if (action === "restore_backup") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.BACKUP.MANAGE);
      const parsed = backupRestoreSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).backup.restore(parsed.data, auth.userId));
    }

    if (action === "generate_report") {
      const auth = await requireApiAuth(PERMISSIONS.PAYROLL.VIEW);
      const parsed = governanceReportSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 422);
      return apiSuccess(await getPayrollGovernanceServices(auth.companyId).report.generate(parsed.data));
    }

    return apiError("Unknown action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
