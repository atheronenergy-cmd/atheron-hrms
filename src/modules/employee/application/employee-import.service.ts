import type { ImportPreviewResult } from "@/modules/employee/domain/types";
import type { EmployeeImportInput } from "@/modules/employee/validation/schemas";

/**
 * Architecture-ready import service.
 * Full Excel/CSV parsing will be implemented in a dedicated import prompt.
 */
export class EmployeeImportService {
  async preview(_file: File, _options: EmployeeImportInput): Promise<ImportPreviewResult> {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      errors: [],
    };
  }

  async execute(_file: File, _options: EmployeeImportInput): Promise<{ imported: number; skipped: number }> {
    throw new Error("Employee import is not yet enabled. Use dry-run preview architecture.");
  }
}

export const employeeImportService = new EmployeeImportService();
