/**
 * Employee Financial module verification.
 * Run: npx tsx scripts/verify-employee-financial.ts
 */
import { encryptValue, decryptValue } from "../src/modules/security/application/encryption.service";
import { encryptionService } from "../src/modules/employee-financial/application/encryption.service";
import {
  bankDetailSchema,
  emergencyContactSchema,
  familyMemberSchema,
  insuranceSchema,
  nomineeSchema,
  statutorySchema,
  taxSchema,
  validateNomineePercentages,
  verifyBankDetailSchema,
} from "../src/modules/employee-financial/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Employee Financial Module Verification ===\n");

assert(PERMISSIONS.EMPLOYEE.BANK.READ === "employee.bank.read", "Bank read permission");
assert(PERMISSIONS.EMPLOYEE.BANK.MANAGE === "employee.bank.manage", "Bank manage permission");
assert(PERMISSIONS.EMPLOYEE.FAMILY.READ === "employee.family.read", "Family read permission");
assert(PERMISSIONS.EMPLOYEE.TAX.MANAGE === "employee.tax.manage", "Tax manage permission");
assert(PERMISSIONS.EMPLOYEE.STATUTORY.READ === "employee.statutory.read", "Statutory read permission");
assert(PERMISSIONS.EMPLOYEE.INSURANCE.MANAGE === "employee.insurance.manage", "Insurance manage permission");

const bank = bankDetailSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  accountHolderName: "John Doe",
  bankName: "State Bank",
  accountNumber: "123456789012",
  ifscCode: "SBIN0001234",
  accountType: "savings",
});
assert(bank.success, "BankDetailSchema accepts valid input");

const verify = verifyBankDetailSchema.safeParse({
  id: "00000000-0000-4000-8000-000000000002",
  version: 1,
  status: "verified",
});
assert(verify.success, "VerifyBankDetailSchema accepts valid input");

const emergency = emergencyContactSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  name: "Jane Doe",
  relation: "Spouse",
  mobile: "9876543210",
});
assert(emergency.success, "EmergencyContactSchema accepts valid input");

const family = familyMemberSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  name: "Child One",
  relation: "child",
});
assert(family.success, "FamilyMemberSchema accepts valid input");

assert(
  validateNomineePercentages([{ percentage: 60 }, { percentage: 40 }]),
  "Nominee allocation validates 100%",
);
assert(
  !validateNomineePercentages([{ percentage: 60 }, { percentage: 30 }]),
  "Nominee allocation rejects invalid total",
);

const nominee = nomineeSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  name: "Nominee A",
  relation: "Spouse",
  percentage: 100,
  nomineeType: "PF",
});
assert(nominee.success, "NomineeSchema accepts valid input");

const statutory = statutorySchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  uanNumber: "100012345678",
  esiEligible: true,
});
assert(statutory.success, "StatutorySchema accepts valid input");

const tax = taxSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  panNumber: "ABCDE1234F",
  taxRegime: "new",
});
assert(tax.success, "TaxSchema accepts valid input");

const insurance = insuranceSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  provider: "LIC",
  policyNumber: "POL123456",
});
assert(insurance.success, "InsuranceSchema accepts valid input");

const plain = "1234567890123456";
const encrypted = encryptValue(plain);
const decrypted = decryptValue(encrypted);
assert(decrypted === plain, "Encryption round-trip works");
assert(
  encryptionService.mask("1234567890123456", "bank_account", false).includes("3456"),
  "Bank account masking shows last digits",
);
assert(
  encryptionService.mask("ABCDE1234F", "pan", false).endsWith("234F"),
  "PAN masking shows last characters",
);

console.log("\n=== All employee financial checks passed ===\n");
