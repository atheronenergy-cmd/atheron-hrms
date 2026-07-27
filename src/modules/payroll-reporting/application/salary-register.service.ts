import { createPayrollReportService } from "@/modules/payroll-reporting/application/payroll-report.service";
import type { salaryRegisterSchema } from "@/modules/payroll-reporting/validation/schemas";
import type { z } from "zod";

export function createSalaryRegisterService(companyId: string) {
  const reportService = createPayrollReportService(companyId);
  return {
    async generate(input: z.infer<typeof salaryRegisterSchema>, actorUserId?: string) {
      return reportService.buildReport(
        {
          reportType: "salary_register",
          payrollId: input.payrollId,
          filters: input.filters,
          exportFile: input.exportFile,
        },
        actorUserId,
      );
    },
  };
}
