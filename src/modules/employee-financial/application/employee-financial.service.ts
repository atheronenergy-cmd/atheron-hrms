import { createEmployeeBankService } from "@/modules/employee-financial/application/employee-bank.service";
import { createEmployeeFamilyService } from "@/modules/employee-financial/application/employee-family.service";
import { createInsuranceService } from "@/modules/employee-financial/application/insurance.service";
import { createNomineeService } from "@/modules/employee-financial/application/nominee.service";
import { createStatutoryService } from "@/modules/employee-financial/application/statutory.service";
import { createTaxService } from "@/modules/employee-financial/application/tax.service";
import type { EmployeeFinancialSummary } from "@/modules/employee-financial/domain/types";

type ViewOptions = { canViewSensitive: boolean };

export type FinancialViewOptions = {
  bank: ViewOptions;
  family: ViewOptions;
  tax: ViewOptions;
  statutory: ViewOptions;
  insurance: ViewOptions;
};

export class EmployeeFinancialService {
  constructor(private readonly companyId: string) {}

  async getSummary(employeeId: string, view: FinancialViewOptions): Promise<EmployeeFinancialSummary> {
    const bank = createEmployeeBankService(this.companyId);
    const family = createEmployeeFamilyService(this.companyId);
    const nominee = createNomineeService(this.companyId);
    const statutory = createStatutoryService(this.companyId);
    const tax = createTaxService(this.companyId);
    const insurance = createInsuranceService(this.companyId);

    const [bankDetails, emergencyContacts, familyMembers, nominees, statutoryDetail, taxProfile, insurancePolicies, nomineeTotalPercentage] =
      await Promise.all([
        bank.listAll(employeeId, view.bank),
        family.listAllEmergencyContacts(employeeId, view.family),
        family.listAllFamilyMembers(employeeId),
        nominee.listAll(employeeId, view.family),
        statutory.getByEmployee(employeeId, view.statutory),
        tax.getByEmployee(employeeId, view.tax),
        insurance.listAll(employeeId, view.insurance),
        nominee.getTotalPercentage(employeeId),
      ]);

    return {
      bankDetails,
      emergencyContacts,
      familyMembers,
      nominees,
      nomineeTotalPercentage,
      statutory: statutoryDetail,
      tax: taxProfile,
      insurance: insurancePolicies,
    };
  }
}

export function createEmployeeFinancialService(companyId: string) {
  return new EmployeeFinancialService(companyId);
}

export function getFinancialServices(companyId: string) {
  return {
    financial: createEmployeeFinancialService(companyId),
    bank: createEmployeeBankService(companyId),
    family: createEmployeeFamilyService(companyId),
    nominee: createNomineeService(companyId),
    statutory: createStatutoryService(companyId),
    tax: createTaxService(companyId),
    insurance: createInsuranceService(companyId),
  };
}
