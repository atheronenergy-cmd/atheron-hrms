import { prisma } from "@/infrastructure/database/prisma-client";
import { generateCode } from "@/shared/utils/id.utils";

type GenerateCodeOptions = {
  companyId: string;
  branchId?: string | null;
  prefix?: string;
};

export class EmployeeIdService {
  async resolvePrefix(companyId: string, branchId?: string | null): Promise<string> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { companyCode: true, settings: true },
    });
    if (!company) return "EMP";

    const settings = (company.settings ?? {}) as Record<string, unknown>;
    const configuredPrefix = settings.employeeCodePrefix as string | undefined;
    if (configuredPrefix) return configuredPrefix.toUpperCase();

    if (company.companyCode) {
      return company.companyCode.toUpperCase().slice(0, 6);
    }

    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, companyId },
        select: { code: true },
      });
      if (branch?.code) return branch.code.toUpperCase();
    }

    return "EMP";
  }

  async generateNextCode(options: GenerateCodeOptions): Promise<string> {
    const prefix = (options.prefix ?? (await this.resolvePrefix(options.companyId, options.branchId))).toUpperCase();

    return prisma.$transaction(async (tx) => {
      const existing = await tx.employeeCodeSequence.findFirst({
        where: {
          companyId: options.companyId,
          branchId: options.branchId ?? null,
        },
      });

      let nextValue: number;
      if (existing) {
        const updated = await tx.employeeCodeSequence.update({
          where: { id: existing.id },
          data: { lastValue: { increment: 1 } },
        });
        nextValue = updated.lastValue;
      } else {
        const created = await tx.employeeCodeSequence.create({
          data: {
            companyId: options.companyId,
            branchId: options.branchId ?? null,
            prefix,
            lastValue: 1,
          },
        });
        nextValue = created.lastValue;
      }

      return generateCode(prefix, nextValue);
    });
  }
}

export const employeeIdService = new EmployeeIdService();

export function createEmployeeIdService() {
  return employeeIdService;
}
