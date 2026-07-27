import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/shared/validation/common.schema";

export const workflowActionSchema = z.object({
  workflowId: uuidSchema,
  version: z.number().int().min(1),
  action: z.enum(["submit", "review", "approve", "reject", "cancel"]),
  comments: z.string().max(2000).optional(),
});

export const joiningInitSchema = z.object({
  employeeId: uuidSchema,
  joiningDate: z.coerce.date(),
});

export const joiningChecklistUpdateSchema = z.object({
  employeeId: uuidSchema,
  version: z.number().int().min(1),
  code: z.string().min(1),
  completed: z.boolean(),
});

export const joiningApprovalSchema = z.object({
  employeeId: uuidSchema,
  version: z.number().int().min(1),
  approverType: z.enum(["hr", "manager"]),
});

export const probationSchema = z.object({
  employeeId: uuidSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reviewerId: uuidSchema.optional(),
  reviewNotes: z.string().max(2000).optional(),
});

export const probationExtendSchema = z.object({
  id: uuidSchema,
  version: z.number().int().min(1),
  extendedTo: z.coerce.date(),
  reviewNotes: z.string().max(2000).optional(),
  recommendation: z.string().max(100).optional(),
});

export const confirmationSchema = z.object({
  employeeId: uuidSchema,
  confirmationDate: z.coerce.date(),
  rating: z.number().min(0).max(5).optional(),
  comments: z.string().max(2000).optional(),
});

export const transferSchema = z.object({
  employeeId: uuidSchema,
  transferType: z.enum(["branch", "department", "location", "manager"]),
  newId: uuidSchema.optional(),
  newValue: z.string().min(1).max(255),
  effectiveDate: z.coerce.date(),
  reason: z.string().max(2000).optional(),
});

export const promotionSchema = z.object({
  employeeId: uuidSchema,
  newDesignationId: uuidSchema,
  promotionDate: z.coerce.date(),
  reason: z.string().max(2000).optional(),
  comments: z.string().max(2000).optional(),
});

export const salaryRevisionSchema = z.object({
  employeeId: uuidSchema,
  newSalary: z.number().min(0),
  effectiveDate: z.coerce.date(),
  reason: z.string().max(2000).optional(),
  revisionType: z.enum(["annual_increment", "promotion_increment", "performance_increment", "other"]).optional(),
});

export const warningSchema = z.object({
  employeeId: uuidSchema,
  warningType: z.enum(["performance", "attendance", "behavior", "policy_violation"]),
  reason: z.string().min(1),
  description: z.string().max(2000).optional(),
  issuedDate: z.coerce.date(),
});

export const suspensionSchema = z.object({
  employeeId: uuidSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  reason: z.string().min(1),
});

export const resignationSchema = z.object({
  employeeId: uuidSchema,
  resignationDate: z.coerce.date(),
  lastWorkingDate: z.coerce.date(),
  reason: z.enum(["career_growth", "personal", "relocation", "higher_studies", "health", "other"]),
  reasonDetails: z.string().max(2000).optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
});

export const resignationActionSchema = z.object({
  id: uuidSchema,
  version: z.number().int().min(1),
  action: z.enum(["manager_approve", "hr_process", "start_clearance", "final_release", "reject"]),
});

export const clearanceItemUpdateSchema = z.object({
  itemId: uuidSchema,
  clearanceId: uuidSchema,
  version: z.number().int().min(1),
  status: z.enum(["pending", "completed", "waived"]),
  remarks: z.string().max(2000).optional(),
});

export const terminationSchema = z.object({
  employeeId: uuidSchema,
  terminationDate: z.coerce.date(),
  reason: z.string().min(1),
  comments: z.string().max(2000).optional(),
});

export const lifecycleListSchema = paginationSchema.extend({
  employeeId: uuidSchema,
  search: z.string().trim().max(255).optional(),
});

export type JoiningInitInput = z.infer<typeof joiningInitSchema>;
export type ProbationInput = z.infer<typeof probationSchema>;
export type ConfirmationInput = z.infer<typeof confirmationSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type PromotionInput = z.infer<typeof promotionSchema>;
export type SalaryRevisionInput = z.infer<typeof salaryRevisionSchema>;
export type WarningInput = z.infer<typeof warningSchema>;
export type SuspensionInput = z.infer<typeof suspensionSchema>;
export type ResignationInput = z.infer<typeof resignationSchema>;
export type TerminationInput = z.infer<typeof terminationSchema>;
