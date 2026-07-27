"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { createBranchService } from "@/modules/organization/application/branch.service";
import { createCompanyService } from "@/modules/organization/application/company.service";
import { createDepartmentService } from "@/modules/organization/application/department.service";
import { createDesignationService } from "@/modules/organization/application/designation.service";
import { createHolidayService } from "@/modules/organization/application/holiday.service";
import { createOrganizationService } from "@/modules/organization/application/organization.service";
import {
  getActorMeta,
  recordOrganizationAudit,
} from "@/modules/organization/application/organization-audit.service";
import { createPolicyService } from "@/modules/organization/application/policy.service";
import {
  createSettingsService,
  createWorkingScheduleService,
} from "@/modules/organization/application/working-schedule.service";
import { ORG_ROUTES } from "@/modules/organization/domain/types";
import {
  companySettingsSchema,
  createBranchSchema,
  createDepartmentSchema,
  createDesignationSchema,
  createHolidaySchema,
  createPolicySchema,
  createWorkingScheduleSchema,
  updateBranchSchema,
  updateCompanySchema,
  updateDepartmentSchema,
  updateDesignationSchema,
  updateHolidaySchema,
  updatePolicySchema,
  updateWorkingScheduleSchema,
} from "@/modules/organization/validation/schemas";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type OrgActionResult<T = void> = {
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
  return {
    org: createOrganizationService(companyId),
    company: createCompanyService(companyId),
    branch: createBranchService(companyId),
    department: createDepartmentService(companyId),
    designation: createDesignationService(companyId),
    holiday: createHolidayService(companyId),
    policy: createPolicyService(companyId),
    schedule: createWorkingScheduleService(companyId),
    settings: createSettingsService(companyId),
  };
}

export async function getOrgDashboardStatsAction() {
  await requirePermission(PERMISSIONS.COMPANY.PROFILE.READ);
  const auth = await requireAuth();
  const companyId = requireCompanyId(auth.companyId);
  return services(companyId).org.getDashboardStats();
}

export async function getOrgStructureAction() {
  await requirePermission(PERMISSIONS.COMPANY.PROFILE.READ);
  const auth = await requireAuth();
  const companyId = requireCompanyId(auth.companyId);
  return services(companyId).org.getStructureTree();
}

export async function getCompanyProfileAction() {
  await requirePermission(PERMISSIONS.COMPANY.PROFILE.READ);
  const auth = await requireAuth();
  const companyId = requireCompanyId(auth.companyId);
  return services(companyId).company.getCurrent();
}

export async function updateCompanyAction(input: unknown): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.COMPANY.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateCompanySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, version, email, phone, website, address, ...rest } = parsed.data;
    const meta = await getActorMeta();
    await services(companyId).company.update(
      id,
      {
        ...rest,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address as object,
      },
      version,
      auth.id,
    );

    await recordOrganizationAudit("company_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "company",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.dashboard);
    revalidatePath(ORG_ROUTES.profile);
    return { success: true, message: "Company profile updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function createBranchAction(input: unknown): Promise<OrgActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.BRANCH.PROFILE.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = createBranchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    const branch = await services(companyId).branch.create(parsed.data, auth.id);
    if (parsed.data.latitude != null && parsed.data.longitude != null && parsed.data.geofenceRadiusMeters != null) {
      const { createGeoFenceService } = await import("@/modules/attendance/gps/application/geo-fence.service");
      await createGeoFenceService(companyId).syncFromBranch(branch.id, auth.id);
    }
    await recordOrganizationAudit("branch_created", {
      companyId,
      actorUserId: auth.id,
      entityId: branch.id,
      entityType: "branch",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.branches);
    revalidatePath(ORG_ROUTES.dashboard);
    return { success: true, message: "Branch created.", data: { id: branch.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function updateBranchAction(input: unknown): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.BRANCH.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateBranchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getActorMeta();
    await services(companyId).branch.update(id, { ...data, version }, auth.id);
    if (data.latitude != null && data.longitude != null && data.geofenceRadiusMeters != null) {
      const { createGeoFenceService } = await import("@/modules/attendance/gps/application/geo-fence.service");
      await createGeoFenceService(companyId).syncFromBranch(id, auth.id);
    }
    await recordOrganizationAudit("branch_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "branch",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.branches);
    return { success: true, message: "Branch updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function deactivateBranchAction(id: string, version: number): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.BRANCH.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const meta = await getActorMeta();
    await services(companyId).branch.deactivate(id, version, auth.id);
    await recordOrganizationAudit("branch_deactivated", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "branch",
      ...meta,
    });
    revalidatePath(ORG_ROUTES.branches);
    return { success: true, message: "Branch deactivated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Action failed." };
  }
}

export async function createDepartmentAction(input: unknown): Promise<OrgActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.DEPARTMENT.PROFILE.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = createDepartmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    const dept = await services(companyId).department.create(parsed.data, auth.id);
    await recordOrganizationAudit("department_created", {
      companyId,
      actorUserId: auth.id,
      entityId: dept.id,
      entityType: "department",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.departments);
    revalidatePath(ORG_ROUTES.dashboard);
    return { success: true, message: "Department created.", data: { id: dept.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function updateDepartmentAction(input: unknown): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.DEPARTMENT.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateDepartmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getActorMeta();
    await services(companyId).department.update(id, { ...data, version }, auth.id);
    await recordOrganizationAudit("department_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "department",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.departments);
    return { success: true, message: "Department updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function createDesignationAction(input: unknown): Promise<OrgActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.DESIGNATION.PROFILE.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = createDesignationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    const item = await services(companyId).designation.create(parsed.data, auth.id);
    await recordOrganizationAudit("designation_created", {
      companyId,
      actorUserId: auth.id,
      entityId: item.id,
      entityType: "designation",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.designations);
    return { success: true, message: "Designation created.", data: { id: item.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function updateDesignationAction(input: unknown): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.DESIGNATION.PROFILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateDesignationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getActorMeta();
    await services(companyId).designation.update(id, { ...data, version }, auth.id);
    await recordOrganizationAudit("designation_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "designation",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.designations);
    return { success: true, message: "Designation updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function createHolidayAction(input: unknown): Promise<OrgActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.HOLIDAY.CALENDAR.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = createHolidaySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    const holiday = await services(companyId).holiday.create(parsed.data, auth.id);
    await recordOrganizationAudit("holiday_created", {
      companyId,
      actorUserId: auth.id,
      entityId: holiday.id,
      entityType: "holiday",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.holidays);
    return { success: true, message: "Holiday created.", data: { id: holiday.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function updateHolidayAction(input: unknown): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.HOLIDAY.CALENDAR.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateHolidaySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getActorMeta();
    await services(companyId).holiday.update(id, { ...data, version }, auth.id);
    await recordOrganizationAudit("holiday_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "holiday",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.holidays);
    return { success: true, message: "Holiday updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function deleteHolidayAction(id: string, version: number): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.HOLIDAY.CALENDAR.DELETE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const meta = await getActorMeta();
    await services(companyId).holiday.softDelete(id, version, auth.id);
    await recordOrganizationAudit("holiday_deleted", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "holiday",
      ...meta,
    });
    revalidatePath(ORG_ROUTES.holidays);
    return { success: true, message: "Holiday deleted." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Delete failed." };
  }
}

export async function createPolicyAction(input: unknown): Promise<OrgActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.HR.POLICY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = createPolicySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    const policy = await services(companyId).policy.create(parsed.data, auth.id);
    await recordOrganizationAudit("policy_created", {
      companyId,
      actorUserId: auth.id,
      entityId: policy.id,
      entityType: "hr_policy",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.policies);
    return { success: true, message: "Policy created.", data: { id: policy.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function updatePolicyAction(input: unknown): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.HR.POLICY.MANAGE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updatePolicySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getActorMeta();
    await services(companyId).policy.update(id, { ...data, version }, auth.id);
    await recordOrganizationAudit("policy_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "hr_policy",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.policies);
    return { success: true, message: "Policy updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function createScheduleAction(input: unknown): Promise<OrgActionResult<{ id: string }>> {
  try {
    await requirePermission(PERMISSIONS.SHIFT.SCHEDULE.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = createWorkingScheduleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    const schedule = await services(companyId).schedule.create(parsed.data, auth.id);
    await recordOrganizationAudit("schedule_created", {
      companyId,
      actorUserId: auth.id,
      entityId: schedule.id,
      entityType: "working_schedule",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.schedules);
    return { success: true, message: "Working schedule created.", data: { id: schedule.id } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Create failed." };
  }
}

export async function updateScheduleAction(input: unknown): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.SHIFT.SCHEDULE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateWorkingScheduleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, version, ...data } = parsed.data;
    const meta = await getActorMeta();
    await services(companyId).schedule.update(id, { ...data, version }, auth.id);
    await recordOrganizationAudit("schedule_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: id,
      entityType: "working_schedule",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.schedules);
    return { success: true, message: "Working schedule updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}

export async function updateCompanySettingsAction(input: unknown): Promise<OrgActionResult> {
  try {
    await requirePermission(PERMISSIONS.COMPANY.PROFILE.CONFIGURE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = companySettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const meta = await getActorMeta();
    await services(companyId).settings.update(parsed.data, auth.id);
    await recordOrganizationAudit("settings_updated", {
      companyId,
      actorUserId: auth.id,
      entityId: companyId,
      entityType: "company_settings",
      ...meta,
    });

    revalidatePath(ORG_ROUTES.settings);
    return { success: true, message: "Company settings saved." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}
