import { createArrearService } from "@/modules/payroll-governance/application/arrear.service";
import { createComplianceSnapshotService } from "@/modules/payroll-governance/application/compliance-snapshot.service";
import { createFinancialYearService } from "@/modules/payroll-governance/application/financial-year.service";
import { createPayrollApprovalService } from "@/modules/payroll-governance/application/payroll-approval.service";
import { createPayrollBackupService } from "@/modules/payroll-governance/application/payroll-backup.service";
import { createPayrollGovernanceAuditService } from "@/modules/payroll-governance/application/payroll-governance-audit.service";
import { createPayrollGovernanceReportService } from "@/modules/payroll-governance/application/payroll-governance-report.service";
import { createPayrollLockService } from "@/modules/payroll-governance/application/payroll-lock.service";
import { createPayrollSnapshotService } from "@/modules/payroll-governance/application/payroll-snapshot.service";
import { createPayrollVersionService } from "@/modules/payroll-governance/application/payroll-version.service";
import { createRetroPayrollService } from "@/modules/payroll-governance/application/retro-payroll.service";

export function getPayrollGovernanceServices(companyId: string) {
  return {
    approval: createPayrollApprovalService(companyId),
    lock: createPayrollLockService(companyId),
    snapshot: createPayrollSnapshotService(companyId),
    version: createPayrollVersionService(companyId),
    retro: createRetroPayrollService(companyId),
    arrear: createArrearService(companyId),
    financialYear: createFinancialYearService(companyId),
    compliance: createComplianceSnapshotService(companyId),
    backup: createPayrollBackupService(companyId),
    report: createPayrollGovernanceReportService(companyId),
    audit: createPayrollGovernanceAuditService(companyId),
  };
}

export type PayrollGovernanceServices = ReturnType<typeof getPayrollGovernanceServices>;
