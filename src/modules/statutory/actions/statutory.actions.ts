"use server";

import { revalidatePath } from "next/cache";

import { getStatutoryServices } from "@/modules/statutory/application/statutory.service";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import {
  employeeStatutoryProfileSchema,
  financialYearSchema,
  incomeTaxConfigurationSchema,
  investmentDeclarationSchema,
  pfConfigurationSchema,
  professionalTaxConfigurationSchema,
  esiConfigurationSchema,
} from "@/modules/statutory/validation/schemas";
import { requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export async function createFinancialYearAction(formData: FormData) {
  const { companyId, auth } = await requireStatutoryContext(PERMISSIONS.STATUTORY.MANAGE);
  const parsed = financialYearSchema.safeParse({
    code: formData.get("code"),
    label: formData.get("label"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    isCurrent: formData.get("isCurrent") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  await getStatutoryServices(companyId).config.createFinancialYear(parsed.data, auth.id);
  revalidatePath(STATUTORY_ROUTES.financialYear);
  return { ok: true };
}

export async function savePFConfigAction(formData: FormData) {
  const { companyId, auth } = await requireStatutoryContext(PERMISSIONS.STATUTORY.PF.MANAGE);
  const parsed = pfConfigurationSchema.safeParse({
    financialYearId: formData.get("financialYearId"),
    employeeContributionRate: Number(formData.get("employeeContributionRate")),
    employerContributionRate: Number(formData.get("employerContributionRate")),
    epsRate: Number(formData.get("epsRate")),
    adminChargeRate: Number(formData.get("adminChargeRate")),
    wageCeiling: Number(formData.get("wageCeiling")),
    vpfAllowed: formData.get("vpfAllowed") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  await getStatutoryServices(companyId).config.upsertPFConfig(parsed.data, auth.id);
  revalidatePath(STATUTORY_ROUTES.pf);
  return { ok: true };
}

export async function saveESIConfigAction(formData: FormData) {
  const { companyId, auth } = await requireStatutoryContext(PERMISSIONS.STATUTORY.ESI.MANAGE);
  const parsed = esiConfigurationSchema.safeParse({
    financialYearId: formData.get("financialYearId"),
    employeeRate: Number(formData.get("employeeRate")),
    employerRate: Number(formData.get("employerRate")),
    eligibilityCeiling: Number(formData.get("eligibilityCeiling")),
  });
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  await getStatutoryServices(companyId).config.upsertESIConfig(parsed.data, auth.id);
  revalidatePath(STATUTORY_ROUTES.esi);
  return { ok: true };
}

export async function savePTConfigAction(formData: FormData) {
  const { companyId, auth } = await requireStatutoryContext(PERMISSIONS.STATUTORY.PT.MANAGE);
  const slabsRaw = formData.get("slabs");
  const parsed = professionalTaxConfigurationSchema.safeParse({
    financialYearId: formData.get("financialYearId"),
    stateCode: formData.get("stateCode"),
    stateName: formData.get("stateName"),
    slabs: slabsRaw ? JSON.parse(String(slabsRaw)) : [],
    maxAmount: Number(formData.get("maxAmount") ?? 0),
  });
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  await getStatutoryServices(companyId).config.upsertPTConfig(parsed.data, auth.id);
  revalidatePath(STATUTORY_ROUTES.pt);
  return { ok: true };
}

export async function saveIncomeTaxConfigAction(formData: FormData) {
  const { companyId, auth } = await requireStatutoryContext(PERMISSIONS.STATUTORY.TDS.MANAGE);
  const slabsRaw = formData.get("slabs");
  const parsed = incomeTaxConfigurationSchema.safeParse({
    financialYearId: formData.get("financialYearId"),
    regime: formData.get("regime"),
    slabs: slabsRaw ? JSON.parse(String(slabsRaw)) : [],
    standardDeduction: Number(formData.get("standardDeduction")),
    rebateLimit: Number(formData.get("rebateLimit") ?? 0),
    rebateAmount: Number(formData.get("rebateAmount") ?? 0),
    cessRate: Number(formData.get("cessRate")),
  });
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  await getStatutoryServices(companyId).config.upsertIncomeTaxConfig(parsed.data, auth.id);
  revalidatePath(STATUTORY_ROUTES.incomeTax);
  return { ok: true };
}

export async function saveInvestmentDeclarationAction(formData: FormData) {
  const { companyId, auth } = await requireStatutoryContext(PERMISSIONS.STATUTORY.MANAGE);
  const parsed = investmentDeclarationSchema.safeParse({
    employeeId: formData.get("employeeId"),
    financialYearId: formData.get("financialYearId"),
    section80C: Number(formData.get("section80C") ?? 0),
    section80D: Number(formData.get("section80D") ?? 0),
    homeLoanInterest: Number(formData.get("homeLoanInterest") ?? 0),
    nps: Number(formData.get("nps") ?? 0),
    educationLoan: Number(formData.get("educationLoan") ?? 0),
  });
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  await getStatutoryServices(companyId).statutory.upsertInvestmentDeclaration(parsed.data, auth.id);
  revalidatePath(STATUTORY_ROUTES.investmentDeclarations);
  return { ok: true };
}

export async function saveEmployeeStatutoryProfileAction(formData: FormData) {
  const { companyId, auth } = await requireStatutoryContext(PERMISSIONS.STATUTORY.MANAGE);
  const parsed = employeeStatutoryProfileSchema.safeParse({
    employeeId: formData.get("employeeId"),
    pfEnabled: formData.get("pfEnabled") === "true",
    esiEnabled: formData.get("esiEnabled") === "true",
    ptEnabled: formData.get("ptEnabled") === "true",
    tdsEnabled: formData.get("tdsEnabled") === "true",
    taxRegime: formData.get("taxRegime") || undefined,
    vpfPercentage: formData.get("vpfPercentage") ? Number(formData.get("vpfPercentage")) : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Validation failed" };
  await getStatutoryServices(companyId).statutory.upsertEmployeeProfile(parsed.data, auth.id);
  return { ok: true };
}
