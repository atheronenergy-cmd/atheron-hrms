"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import {
  getFinancialActorMeta,
  recordFinancialAudit,
} from "@/modules/employee-financial/application/financial-audit.service";
import { getFinancialServices } from "@/modules/employee-financial/application/employee-financial.service";
import {
  bankDetailSchema,
  emergencyContactSchema,
  familyMemberSchema,
  insuranceSchema,
  nomineeSchema,
  statutorySchema,
  taxSchema,
  updateBankDetailSchema,
  updateEmergencyContactSchema,
  updateFamilyMemberSchema,
  updateInsuranceSchema,
  updateNomineeSchema,
  verifyBankDetailSchema,
} from "@/modules/employee-financial/validation/schemas";
import { EMPLOYEE_ROUTES } from "@/modules/employee/domain/types";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type FinancialActionResult<T = void> = {
  success: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};

function requireCompanyId(companyId: string | null): string {
  if (!companyId) throw new Error("Company context required");
  return companyId;
}

function services(companyId: string) {
  return getFinancialServices(companyId);
}

function revalidateEmployee(employeeId: string) {
  revalidatePath(EMPLOYEE_ROUTES.detail(employeeId));
}

export async function createBankDetailAction(input: unknown): Promise<FinancialActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.BANK.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = bankDetailSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getFinancialActorMeta();
    const row = await services(companyId).bank.create(parsed.data, auth.id);
    await recordFinancialAudit("bank_details_added", {
      companyId,
      employeeId: parsed.data.employeeId,
      actorUserId: auth.id,
      entityId: row.id,
      entityType: "employee_bank_detail",
      ...meta,
    });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Bank details saved.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function updateBankDetailAction(input: unknown): Promise<FinancialActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.BANK.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateBankDetailSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getFinancialActorMeta();
    await services(companyId).bank.update(id, version, data, auth.id);
    await recordFinancialAudit("bank_details_changed", {
      companyId,
      employeeId: data.employeeId ?? parsed.data.employeeId!,
      actorUserId: auth.id,
      entityId: id,
      entityType: "employee_bank_detail",
      ...meta,
    });
    if (data.employeeId) revalidateEmployee(data.employeeId);
    return { success: true, message: "Bank details updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function verifyBankDetailAction(input: unknown): Promise<FinancialActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.BANK.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = verifyBankDetailSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getFinancialActorMeta();
    const row = await services(companyId).bank.verify(parsed.data.id, parsed.data.version, parsed.data.status, auth.id, parsed.data.remarks);
    await recordFinancialAudit(parsed.data.status === "verified" ? "bank_verified" : "bank_rejected", {
      companyId,
      employeeId: row.employeeId,
      actorUserId: auth.id,
      entityId: row.id,
      entityType: "employee_bank_detail",
      ...meta,
      metadata: { status: parsed.data.status },
    });
    revalidateEmployee(row.employeeId);
    return { success: true, message: `Bank details ${parsed.data.status}.` };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Verification failed." };
  }
}

export async function createEmergencyContactAction(input: unknown): Promise<FinancialActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.FAMILY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = emergencyContactSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const row = await services(companyId).family.createEmergencyContact(parsed.data, auth.id);
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Emergency contact added.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function updateEmergencyContactAction(input: unknown): Promise<FinancialActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.FAMILY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateEmergencyContactSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const { id, version, ...data } = parsed.data;
    await services(companyId).family.updateEmergencyContact(id, version, data, auth.id);
    if (data.employeeId) revalidateEmployee(data.employeeId);
    return { success: true, message: "Emergency contact updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function createFamilyMemberAction(input: unknown): Promise<FinancialActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.FAMILY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = familyMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getFinancialActorMeta();
    const row = await services(companyId).family.createFamilyMember(parsed.data, auth.id);
    await recordFinancialAudit("family_member_added", {
      companyId,
      employeeId: parsed.data.employeeId,
      actorUserId: auth.id,
      entityId: row.id,
      entityType: "employee_family_member",
      ...meta,
    });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Family member added.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function updateFamilyMemberAction(input: unknown): Promise<FinancialActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.FAMILY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateFamilyMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getFinancialActorMeta();
    await services(companyId).family.updateFamilyMember(id, version, data, auth.id);
    await recordFinancialAudit("family_member_changed", {
      companyId,
      employeeId: data.employeeId ?? parsed.data.employeeId!,
      actorUserId: auth.id,
      entityId: id,
      entityType: "employee_family_member",
      ...meta,
    });
    if (data.employeeId) revalidateEmployee(data.employeeId);
    return { success: true, message: "Family member updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function createNomineeAction(input: unknown): Promise<FinancialActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.FAMILY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = nomineeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getFinancialActorMeta();
    const row = await services(companyId).nominee.create(parsed.data, auth.id);
    await recordFinancialAudit("nominee_changed", {
      companyId,
      employeeId: parsed.data.employeeId,
      actorUserId: auth.id,
      entityId: row.id,
      entityType: "employee_nominee",
      ...meta,
      metadata: { action: "create" },
    });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Nominee added.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function updateNomineeAction(input: unknown): Promise<FinancialActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.FAMILY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateNomineeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getFinancialActorMeta();
    await services(companyId).nominee.update(id, version, data, auth.id);
    await recordFinancialAudit("nominee_changed", {
      companyId,
      employeeId: data.employeeId ?? parsed.data.employeeId!,
      actorUserId: auth.id,
      entityId: id,
      entityType: "employee_nominee",
      ...meta,
      metadata: { action: "update" },
    });
    if (data.employeeId) revalidateEmployee(data.employeeId);
    return { success: true, message: "Nominee updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function upsertStatutoryAction(input: unknown): Promise<FinancialActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.STATUTORY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = statutorySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getFinancialActorMeta();
    const row = await services(companyId).statutory.upsert(parsed.data, auth.id);
    await recordFinancialAudit("statutory_changed", {
      companyId,
      employeeId: parsed.data.employeeId,
      actorUserId: auth.id,
      entityId: row.id,
      entityType: "employee_statutory_detail",
      ...meta,
    });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Statutory information saved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function upsertTaxProfileAction(input: unknown): Promise<FinancialActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.TAX.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = taxSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getFinancialActorMeta();
    const row = await services(companyId).tax.upsert(parsed.data, auth.id);
    await recordFinancialAudit("tax_updated", {
      companyId,
      employeeId: parsed.data.employeeId,
      actorUserId: auth.id,
      entityId: row.id,
      entityType: "employee_tax_profile",
      ...meta,
    });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Tax profile saved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function createInsuranceAction(input: unknown): Promise<FinancialActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.INSURANCE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = insuranceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const meta = await getFinancialActorMeta();
    const row = await services(companyId).insurance.create(parsed.data, auth.id);
    await recordFinancialAudit("insurance_added", {
      companyId,
      employeeId: parsed.data.employeeId,
      actorUserId: auth.id,
      entityId: row.id,
      entityType: "employee_insurance",
      ...meta,
    });
    revalidateEmployee(parsed.data.employeeId);
    return { success: true, message: "Insurance policy added.", data: { id: row.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Save failed." };
  }
}

export async function updateInsuranceAction(input: unknown): Promise<FinancialActionResult> {
  try {
    await requirePermission(PERMISSIONS.EMPLOYEE.INSURANCE.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateInsuranceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getFinancialActorMeta();
    await services(companyId).insurance.update(id, version, data, auth.id);
    await recordFinancialAudit("insurance_changed", {
      companyId,
      employeeId: data.employeeId ?? parsed.data.employeeId!,
      actorUserId: auth.id,
      entityId: id,
      entityType: "employee_insurance",
      ...meta,
    });
    if (data.employeeId) revalidateEmployee(data.employeeId);
    return { success: true, message: "Insurance policy updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}
