import { createEmployeeService } from "./employee.service";
import type { EmployeeExportInput } from "@/modules/employee/validation/schemas";

/**
 * Architecture-ready export service.
 * CSV/Excel/PDF generation will be extended with reporting module.
 */
export class EmployeeExportService {
  constructor(private readonly companyId: string) {}

  async export(query: EmployeeExportInput): Promise<{ filename: string; content: string; mimeType: string }> {
    const data = await createEmployeeService(this.companyId).list({
      page: 1,
      pageSize: 10000,
      branchId: query.branchId,
      departmentId: query.departmentId,
      employmentStatus: query.employmentStatus,
      sortBy: "employeeCode",
      sortOrder: "asc",
    });

    const headers = ["Employee ID", "Name", "Email", "Phone", "Branch", "Department", "Designation", "Status"];
    const rows = data.items.map((e) =>
      [e.employeeCode, e.fullName, e.email, e.phone ?? "", e.branchName, e.departmentName, e.designationName, e.employmentStatus].join(","),
    );

    const content = [headers.join(","), ...rows].join("\n");
    return {
      filename: `employees-${new Date().toISOString().slice(0, 10)}.csv`,
      content,
      mimeType: "text/csv",
    };
  }
}

export function createEmployeeExportService(companyId: string) {
  return new EmployeeExportService(companyId);
}
