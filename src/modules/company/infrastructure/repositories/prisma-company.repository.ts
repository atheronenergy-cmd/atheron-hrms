import type { Company, Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import type { PaginatedResult } from "@/shared/types";
import type { FindManyParams, IRepository } from "@/shared/types/repository.types";

export type CreateCompanyData = Prisma.CompanyCreateInput;
export type UpdateCompanyData = Prisma.CompanyUpdateInput;
export type CompanyQuery = FindManyParams & { status?: string };

export interface CompanyRepository
  extends IRepository<Company, CreateCompanyData, UpdateCompanyData, CompanyQuery> {
  findBySlug(slug: string): Promise<Company | null>;
}

export class PrismaCompanyRepository extends BaseRepository implements CompanyRepository {
  async findById(id: string): Promise<Company | null> {
    return this.db.company.findFirst({
      where: { id, ...this.softDeleteFilter() },
    });
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return this.db.company.findFirst({
      where: { slug, ...this.softDeleteFilter() },
    });
  }

  async findMany(query: CompanyQuery): Promise<PaginatedResult<Company>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = {
      ...this.softDeleteFilter(),
      ...(query.status ? { status: query.status as Company["status"] } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search, mode: "insensitive" as const } }] }
        : {}),
    };
    return this.paginate(
      ({ skip, take }) => this.db.company.findMany({ where, skip, take, orderBy: { name: "asc" } }),
      () => this.db.company.count({ where }),
      page,
      pageSize,
    );
  }

  async create(data: CreateCompanyData): Promise<Company> {
    return this.db.company.create({ data });
  }

  async update(id: string, data: UpdateCompanyData, version: number): Promise<Company> {
    return this.db.company.update({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.db.company.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }
}

export const createCompanyRepository = (companyId?: string) => new PrismaCompanyRepository(companyId);
