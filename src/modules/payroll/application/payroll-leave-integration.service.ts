import { BaseRepository } from "@/infrastructure/database/base-repository";
import { createLeavePayrollIntegrationService } from "@/modules/leave/application/leave-payroll-integration.service";

export type LeavePayrollSummary = {
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lwpDays: number;
  totalLeaveDays: number;
};

export class PayrollLeaveIntegrationService extends BaseRepository {
  async getSummary(employeeId: string, startDate: Date, endDate: Date): Promise<LeavePayrollSummary> {
    const adjustments = await createLeavePayrollIntegrationService(this.requireCompanyId()).getPayrollAdjustments({
      periodStart: startDate,
      periodEnd: endDate,
      employeeId,
    });

    let paidLeaveDays = 0;
    let lwpDays = 0;
    for (const a of adjustments) {
      paidLeaveDays += a.paidLeaveDays;
      lwpDays += a.lwpDays;
    }

    return {
      paidLeaveDays,
      unpaidLeaveDays: lwpDays,
      lwpDays,
      totalLeaveDays: paidLeaveDays + lwpDays,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createPayrollLeaveIntegrationService(companyId: string) {
  return new PayrollLeaveIntegrationService(companyId);
}
