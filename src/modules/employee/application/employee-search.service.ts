import { createEmployeeService } from "./employee.service";
import type { EmployeeSearchInput } from "@/modules/employee/validation/schemas";

export class EmployeeSearchService {
  constructor(private readonly companyId: string) {}

  async search(query: EmployeeSearchInput) {
    return createEmployeeService(this.companyId).list(query);
  }
}

export function createEmployeeSearchService(companyId: string) {
  return new EmployeeSearchService(companyId);
}
