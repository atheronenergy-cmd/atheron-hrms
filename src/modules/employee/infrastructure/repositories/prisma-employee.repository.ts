import type { Employee, Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import type { PaginatedResult } from "@/shared/types";
import type { FindManyParams, IRepository } from "@/shared/types/repository.types";

export type CreateEmployeeData = Prisma.EmployeeCreateInput;
export type UpdateEmployeeData = Prisma.EmployeeUpdateInput;
export type EmployeeQuery = FindManyParams & {
  branchId?: string;
  departmentId?: string;
  employmentStatus?: string;
};

export interface EmployeeRepository
  extends IRepository<Employee, CreateEmployeeData, UpdateEmployeeData, EmployeeQuery> {
  findByCode(employeeCode: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
}

export class PrismaEmployeeRepository extends BaseRepository implements EmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    return this.db.employee.findFirst({
      where: this.withTenantFilter({ id, ...this.softDeleteFilter() }),
    });
  }

  async findByCode(employeeCode: string): Promise<Employee | null> {
    return this.db.employee.findFirst({
      where: this.withTenantFilter({ employeeCode, ...this.softDeleteFilter() }),
    });
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.db.employee.findFirst({
      where: this.withTenantFilter({ email, ...this.softDeleteFilter() }),
    });
  }

  async findMany(query: EmployeeQuery): Promise<PaginatedResult<Employee>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = this.withTenantFilter({
      ...this.softDeleteFilter(),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.employmentStatus
        ? { employmentStatus: query.employmentStatus as Employee["employmentStatus"] }
        : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" as const } },
              { lastName: { contains: query.search, mode: "insensitive" as const } },
              { employeeCode: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    });

    return this.paginate(
      ({ skip, take }) =>
        this.db.employee.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      () => this.db.employee.count({ where }),
      page,
      pageSize,
    );
  }

  async create(data: CreateEmployeeData): Promise<Employee> {
    return this.db.employee.create({ data });
  }

  async update(id: string, data: UpdateEmployeeData, version: number): Promise<Employee> {
    return this.db.employee.update({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.db.employee.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }
}

export const createEmployeeRepository = (companyId: string) => new PrismaEmployeeRepository(companyId);
