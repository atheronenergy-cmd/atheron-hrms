import type { Company, Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "@/infrastructure/database/prisma-client";
import type { CompanyProfile } from "@/modules/organization/domain/types";
import type { companyQuerySchema } from "@/modules/organization/validation/schemas";
import { buildPaginatedResult } from "@/shared/pagination";

type CompanyQueryInput = z.infer<typeof companyQuerySchema>;

function mapCompanyProfile(company: Company): CompanyProfile {
  return {
    id: company.id,
    name: company.name,
    legalName: company.legalName,
    slug: company.slug,
    companyCode: company.companyCode,
    logoFileId: company.logoFileId,
    registrationNumber: company.registrationNumber,
    taxId: company.taxId,
    gstNumber: company.gstNumber,
    panNumber: company.panNumber,
    cinNumber: company.cinNumber,
    email: company.email,
    phone: company.phone,
    website: company.website,
    address: (company.address ?? {}) as Record<string, unknown>,
    countryCode: company.countryCode,
    state: company.state,
    city: company.city,
    pinCode: company.pinCode,
    currencyCode: company.currencyCode,
    timezone: company.timezone,
    dateFormat: company.dateFormat,
    fiscalYearStartMonth: company.fiscalYearStartMonth,
    payrollCycleDay: company.payrollCycleDay,
    status: company.status,
    version: company.version,
  };
}

export class CompanyService {
  constructor(private readonly defaultCompanyId?: string) {}

  async getById(id: string): Promise<CompanyProfile | null> {
    const company = await prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    return company ? mapCompanyProfile(company) : null;
  }

  async getCurrent(): Promise<CompanyProfile | null> {
    if (!this.defaultCompanyId) return null;
    return this.getById(this.defaultCompanyId);
  }

  async list(query: CompanyQueryInput) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.CompanyWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { companyCode: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.company.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.company.count({ where }),
    ]);
    return buildPaginatedResult(items.map(mapCompanyProfile), totalItems, page, pageSize);
  }

  async create(data: Prisma.CompanyCreateInput, actorUserId: string): Promise<CompanyProfile> {
    const company = await prisma.company.create({
      data: { ...data, createdBy: actorUserId },
    });
    return mapCompanyProfile(company);
  }

  async update(
    id: string,
    data: Prisma.CompanyUpdateInput,
    version: number,
    actorUserId: string,
  ): Promise<CompanyProfile> {
    const company = await prisma.company.update({
      where: { id, version },
      data: { ...data, updatedBy: actorUserId, version: { increment: 1 } },
    });
    return mapCompanyProfile(company);
  }
}

export function createCompanyService(companyId?: string) {
  return new CompanyService(companyId);
}
