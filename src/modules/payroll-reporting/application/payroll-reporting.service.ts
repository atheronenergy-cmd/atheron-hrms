import { createAccountingExportService } from "@/modules/payroll-reporting/application/accounting-export.service";
import { listAccountingProviders } from "@/modules/payroll-reporting/application/accounting-providers/index";
import { createBankTransferService } from "@/modules/payroll-reporting/application/bank-transfer.service";
import { listBankProviders } from "@/modules/payroll-reporting/application/bank-providers/index";
import { createCostCenterService } from "@/modules/payroll-reporting/application/cost-center.service";
import { createJournalEntryService } from "@/modules/payroll-reporting/application/journal-entry.service";
import { createPayrollAnalyticsService } from "@/modules/payroll-reporting/application/payroll-analytics.service";
import { createPayrollReportService } from "@/modules/payroll-reporting/application/payroll-report.service";
import { createPayrollReportingAuditService } from "@/modules/payroll-reporting/application/payroll-reporting-audit.service";
import { createSalaryRegisterService } from "@/modules/payroll-reporting/application/salary-register.service";

export function getPayrollReportingServices(companyId: string) {
  return {
    report: createPayrollReportService(companyId),
    salaryRegister: createSalaryRegisterService(companyId),
    bankTransfer: createBankTransferService(companyId),
    accounting: createAccountingExportService(companyId),
    journal: createJournalEntryService(companyId),
    costCenter: createCostCenterService(companyId),
    analytics: createPayrollAnalyticsService(companyId),
    audit: createPayrollReportingAuditService(companyId),
    bankProviders: listBankProviders(),
    accountingProviders: listAccountingProviders(),
  };
}
