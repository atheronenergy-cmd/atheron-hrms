import { createHash } from "crypto";

import type { PayslipPasswordRule } from "@prisma/client";

type EmployeePasswordContext = {
  employeeCode: string;
  dateOfBirth?: Date | null;
  phone?: string | null;
  customPolicyValue?: string;
};

export function generatePayslipPassword(rule: PayslipPasswordRule, employee: EmployeePasswordContext): string | null {
  switch (rule) {
    case "none":
      return null;
    case "employee_id_dob": {
      const dob = employee.dateOfBirth?.toISOString().slice(0, 10).replace(/-/g, "") ?? "00000000";
      return `${employee.employeeCode}${dob}`;
    }
    case "employee_code_dob": {
      const dob = employee.dateOfBirth?.toISOString().slice(0, 10).replace(/-/g, "") ?? "00000000";
      return `${employee.employeeCode.toUpperCase()}${dob.slice(-4)}`;
    }
    case "mobile_last4": {
      const digits = (employee.phone ?? "").replace(/\D/g, "");
      return digits.slice(-4) || employee.employeeCode.slice(-4);
    }
    case "custom_policy":
      return employee.customPolicyValue ?? employee.employeeCode;
    default:
      return employee.employeeCode;
  }
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string) {
  return hashPassword(password) === hash;
}

export function createPayslipPasswordService() {
  return { generatePayslipPassword, hashPassword, verifyPassword };
}
