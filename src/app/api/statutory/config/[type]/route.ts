import { getStatutoryServices } from "@/modules/statutory/application/statutory.service";
import { apiError, apiSuccess, requireApiAuth } from "@/modules/attendance/gps/server/api-utils";
import {
  esiConfigurationSchema,
  incomeTaxConfigurationSchema,
  pfConfigurationSchema,
  professionalTaxConfigurationSchema,
} from "@/modules/statutory/validation/schemas";
import { handleApiError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type RouteContext = { params: Promise<{ type: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.STATUTORY.VIEW);
    const { type } = await context.params;
    const fy = await getStatutoryServices(auth.companyId).config.listFinancialYears();
    const current = fy.find((f) => f.isCurrent) ?? fy[0];
    if (!current) return apiSuccess({ configured: false });
    const configs = await getStatutoryServices(auth.companyId).config.getActiveConfigs(current.id);
    const keyMap: Record<string, keyof typeof configs> = {
      pf: "pf",
      esi: "esi",
      pt: "pt",
      "income-tax": "incomeTaxNew",
    };
    const key = keyMap[type];
    if (!key) return apiError("Unknown config type", 404);
    return apiSuccess({ financialYear: current, config: configs[key] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth(PERMISSIONS.STATUTORY.MANAGE);
    const { type } = await context.params;
    const body = await request.json();
    const svc = getStatutoryServices(auth.companyId).config;

    switch (type) {
      case "pf": {
        const parsed = pfConfigurationSchema.safeParse(body);
        if (!parsed.success) return apiError("Validation failed", 422);
        return apiSuccess(await svc.upsertPFConfig(parsed.data, auth.userId));
      }
      case "esi": {
        const parsed = esiConfigurationSchema.safeParse(body);
        if (!parsed.success) return apiError("Validation failed", 422);
        return apiSuccess(await svc.upsertESIConfig(parsed.data, auth.userId));
      }
      case "pt": {
        const parsed = professionalTaxConfigurationSchema.safeParse(body);
        if (!parsed.success) return apiError("Validation failed", 422);
        return apiSuccess(await svc.upsertPTConfig(parsed.data, auth.userId));
      }
      case "income-tax": {
        const parsed = incomeTaxConfigurationSchema.safeParse(body);
        if (!parsed.success) return apiError("Validation failed", 422);
        return apiSuccess(await svc.upsertIncomeTaxConfig(parsed.data, auth.userId));
      }
      default:
        return apiError("Unknown config type", 404);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
