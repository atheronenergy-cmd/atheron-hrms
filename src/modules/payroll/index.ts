export const MODULE_NAME = "payroll" as const;

export { SALARY_ROUTES, PAYROLL_ROUTES, DEFAULT_SALARY_STRUCTURES } from "./domain/types";
export { getSalaryServices } from "./application/employee-salary.service";
export { getPayrollServices } from "./application/payroll.service";
export { salaryFormulaEngine } from "./application/salary-formula.service";
export {
  createSalaryStructureAction,
  assignEmployeeSalaryAction,
  approveEmployeeSalaryAction,
} from "./actions/salary.actions";
export {
  generatePayrollAction,
  calculatePayrollAction,
  approvePayrollAction,
  lockPayrollAction,
} from "./actions/payroll.actions";
