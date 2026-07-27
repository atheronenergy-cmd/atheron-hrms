import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/shared/validation/common.schema";

export const bankAccountTypeSchema = z.enum(["savings", "current"]);
export const bankVerificationStatusSchema = z.enum(["pending", "verified", "rejected"]);
export const taxRegimeSchema = z.enum(["old", "new"]);
export const insuranceStatusSchema = z.enum(["active", "inactive", "expired", "cancelled"]);

export const bankDetailSchema = z.object({
  employeeId: uuidSchema,
  accountHolderName: z.string().min(1).max(200),
  bankName: z.string().min(1).max(200),
  branchName: z.string().max(200).optional(),
  accountNumber: z.string().min(4).max(30),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC code"),
  accountType: bankAccountTypeSchema.default("savings"),
  upiId: z.string().max(100).optional(),
  isPrimary: z.boolean().default(true),
  remarks: z.string().max(2000).optional(),
});

export const updateBankDetailSchema = bankDetailSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const verifyBankDetailSchema = z.object({
  id: uuidSchema,
  version: z.number().int().min(1),
  status: z.enum(["verified", "rejected"]),
  remarks: z.string().max(2000).optional(),
});

export const emergencyContactSchema = z.object({
  employeeId: uuidSchema,
  name: z.string().min(1).max(200),
  relation: z.string().min(1).max(100),
  mobile: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")),
  address: z
    .object({
      line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pinCode: z.string().optional(),
    })
    .optional(),
  priority: z.number().int().min(1).max(10).default(1),
  isPrimary: z.boolean().default(false),
});

export const updateEmergencyContactSchema = emergencyContactSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const familyMemberSchema = z.object({
  employeeId: uuidSchema,
  name: z.string().min(1).max(200),
  relation: z.enum(["spouse", "child", "parent", "other"]),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
  occupation: z.string().max(200).optional(),
  isDependent: z.boolean().default(false),
  dependentSince: z.coerce.date().optional().nullable(),
});

export const updateFamilyMemberSchema = familyMemberSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const nomineeSchema = z.object({
  employeeId: uuidSchema,
  name: z.string().min(1).max(200),
  relation: z.string().min(1).max(100),
  dateOfBirth: z.coerce.date().optional().nullable(),
  address: z.record(z.string()).optional(),
  mobile: z.string().max(20).optional(),
  percentage: z.number().min(0.01).max(100),
  nomineeType: z.string().min(1).max(100),
});

export const updateNomineeSchema = nomineeSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const statutorySchema = z.object({
  employeeId: uuidSchema,
  pfNumber: z.string().max(30).optional(),
  uanNumber: z.string().max(20).optional(),
  esiNumber: z.string().max(20).optional(),
  esiEligible: z.boolean().default(false),
  pfJoiningDate: z.coerce.date().optional().nullable(),
  pfContributionType: z.string().max(50).optional(),
  professionalTaxApplicable: z.boolean().default(false),
  lwfApplicable: z.boolean().default(false),
});

export const taxSchema = z.object({
  employeeId: uuidSchema,
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, "Invalid PAN").optional(),
  taxRegime: taxRegimeSchema.optional(),
  financialYear: z.string().max(10).optional(),
  taxDeclaration: z.record(z.unknown()).optional(),
  investmentDeclaration: z.record(z.unknown()).optional(),
  previousEmployer: z.record(z.unknown()).optional(),
});

export const insuranceSchema = z.object({
  employeeId: uuidSchema,
  provider: z.string().min(1).max(200),
  policyNumber: z.string().min(1).max(50),
  coverageAmount: z.number().min(0).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  nomineeName: z.string().max(200).optional(),
  policyStatus: insuranceStatusSchema.default("active"),
});

export const updateInsuranceSchema = insuranceSchema.partial().extend({
  id: uuidSchema,
  version: z.number().int().min(1),
});

export const financialListSchema = paginationSchema.extend({
  employeeId: uuidSchema,
  search: z.string().trim().max(255).optional(),
});

export type BankDetailInput = z.infer<typeof bankDetailSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type NomineeInput = z.infer<typeof nomineeSchema>;
export type StatutoryInput = z.infer<typeof statutorySchema>;
export type TaxInput = z.infer<typeof taxSchema>;
export type InsuranceInput = z.infer<typeof insuranceSchema>;
export type FinancialListInput = z.infer<typeof financialListSchema>;

export function validateNomineePercentages(nominees: Array<{ percentage: number }>) {
  const total = nominees.reduce((sum, n) => sum + n.percentage, 0);
  return Math.abs(total - 100) < 0.01;
}
