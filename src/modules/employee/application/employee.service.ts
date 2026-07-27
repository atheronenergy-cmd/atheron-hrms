import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { EmployeeProfile, EmployeeTimelineItem } from "@/modules/employee/domain/types";
import type {
  CreateEmployeeInput,
  EmployeeSearchInput,
  UpdateEmployeeInput,
} from "@/modules/employee/validation/schemas";
import { encryptValue } from "@/modules/security/application/encryption.service";
import { dataMaskingService } from "@/modules/security/application/data-masking.service";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

import { createEmployeeIdService } from "./employee-id.service";
import { createEmployeeTimelineService } from "./employee-timeline.service";

const employeeInclude = {
  branch: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true, level: true } },
  reportingManager: {
    select: { id: true, firstName: true, middleName: true, lastName: true, employeeCode: true },
  },
} satisfies Prisma.EmployeeInclude;

function fullName(first: string, middle: string | null, last: string) {
  return [first, middle, last].filter(Boolean).join(" ");
}

function formatDate(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : null;
}

function encryptIdentityDocs(docs: Record<string, unknown> | undefined) {
  if (!docs) return {};
  const sensitiveKeys = ["aadhaar", "pan", "passport", "drivingLicence", "voterId", "uan", "esicNumber"];
  const result: Record<string, unknown> = { ...docs };
  for (const key of sensitiveKeys) {
    const val = docs[key];
    if (typeof val === "string" && val.length > 0) {
      result[key] = encryptValue(val);
    }
  }
  return result;
}

export class EmployeeService extends BaseRepository {
  private timeline = createEmployeeTimelineService(this.companyId);

  async list(query: EmployeeSearchInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";
    const orderBy = { [sortBy]: sortOrder } as Prisma.EmployeeOrderByWithRelationInput;

    const where: Prisma.EmployeeWhereInput = {
      companyId,
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.designationId ? { designationId: query.designationId } : {}),
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { middleName: { contains: query.search, mode: "insensitive" } },
              { employeeCode: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
              { personalEmail: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          branch: { select: { name: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    const items = rows.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      fullName: fullName(e.firstName, e.middleName, e.lastName),
      email: e.email,
      phone: e.phone,
      branchName: e.branch.name,
      departmentName: e.department.name,
      designationName: e.designation.name,
      employmentStatus: e.employmentStatus,
      employmentType: e.employmentType,
      dateOfJoining: formatDate(e.dateOfJoining)!,
      status: e.status,
      version: e.version,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getById(id: string) {
    const companyId = this.requireCompanyId();
    const emp = await prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
      include: employeeInclude,
    });
    if (!emp) throw new NotFoundError("Employee", id);
    return this.toProfile(emp, true);
  }

  async create(input: CreateEmployeeInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const idService = createEmployeeIdService();
    const employeeCode =
      input.employeeCode && !input.autoGenerateCode
        ? input.employeeCode.toUpperCase()
        : await idService.generateNextCode({ companyId, branchId: input.branchId });

    const existingCode = await prisma.employee.findFirst({
      where: { companyId, employeeCode, deletedAt: null },
    });
    if (existingCode) throw new ConflictError("Employee code already exists");

    const existingEmail = await prisma.employee.findFirst({
      where: { companyId, email: input.email, deletedAt: null },
    });
    if (existingEmail) throw new ConflictError("Company email already in use");

    const employee = await prisma.employee.create({
      data: {
        companyId,
        branchId: input.branchId,
        departmentId: input.departmentId,
        designationId: input.designationId,
        reportingManagerId: input.reportingManagerId ?? null,
        employeeCode,
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName,
        preferredName: input.preferredName ?? null,
        email: input.email,
        personalEmail: input.personalEmail || null,
        phone: input.phone ?? null,
        alternatePhone: input.alternatePhone ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
        bloodGroup: input.bloodGroup ?? null,
        nationality: input.nationality ?? null,
        maritalStatus: input.maritalStatus ?? null,
        fatherName: input.fatherName ?? null,
        motherName: input.motherName ?? null,
        spouseName: input.spouseName ?? null,
        emergencyContact: (input.emergencyContact ?? {}) as Prisma.InputJsonValue,
        permanentAddress: (input.permanentAddress ?? {}) as Prisma.InputJsonValue,
        currentAddress: (input.currentAddress ?? {}) as Prisma.InputJsonValue,
        identityDocuments: encryptIdentityDocs(input.identityDocuments) as Prisma.InputJsonValue,
        dateOfJoining: input.dateOfJoining,
        confirmationDate: input.confirmationDate ?? null,
        employmentType: input.employmentType,
        employmentStatus: input.employmentStatus,
        probationStatus: input.probationStatus ?? null,
        noticePeriodDays: input.noticePeriodDays ?? null,
        workLocation: input.workLocation ?? null,
        remarks: input.remarks ?? null,
        createdBy: actorUserId,
      },
      include: employeeInclude,
    });

    await this.timeline.record({
      employeeId: employee.id,
      eventType: "employee_created",
      title: "Employee created",
      description: `${fullName(employee.firstName, employee.middleName, employee.lastName)} joined as ${employee.designation.name}`,
      actorUserId,
      metadata: { employeeCode, branchId: employee.branchId, departmentId: employee.departmentId },
    });

    return { id: employee.id, employeeCode, profile: this.toProfile(employee, true) };
  }

  async update(input: UpdateEmployeeInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.employee.findFirst({
      where: { id: input.id, companyId, deletedAt: null },
      include: employeeInclude,
    });
    if (!existing) throw new NotFoundError("Employee", input.id);

    if (input.email && input.email !== existing.email) {
      const dup = await prisma.employee.findFirst({
        where: { companyId, email: input.email, deletedAt: null, NOT: { id: input.id } },
      });
      if (dup) throw new ConflictError("Company email already in use");
    }

    const changes: Array<{ eventType: string; title: string; metadata: Record<string, unknown> }> = [];
    if (input.departmentId && input.departmentId !== existing.departmentId) {
      changes.push({ eventType: "department_changed", title: "Department changed", metadata: { from: existing.departmentId, to: input.departmentId } });
    }
    if (input.designationId && input.designationId !== existing.designationId) {
      changes.push({ eventType: "designation_changed", title: "Designation changed", metadata: { from: existing.designationId, to: input.designationId } });
    }
    if (input.branchId && input.branchId !== existing.branchId) {
      changes.push({ eventType: "branch_transfer", title: "Branch transfer", metadata: { from: existing.branchId, to: input.branchId } });
    }
    if (input.reportingManagerId !== undefined && input.reportingManagerId !== existing.reportingManagerId) {
      changes.push({ eventType: "manager_changed", title: "Reporting manager changed", metadata: { from: existing.reportingManagerId, to: input.reportingManagerId } });
    }
    if (input.employmentStatus && input.employmentStatus !== existing.employmentStatus) {
      changes.push({ eventType: "status_changed", title: "Employment status changed", metadata: { from: existing.employmentStatus, to: input.employmentStatus } });
    }

    const identityUpdate =
      input.identityDocuments !== undefined
        ? encryptIdentityDocs(input.identityDocuments as Record<string, unknown>)
        : undefined;

    const updated = await prisma.employee.update({
      where: { id: input.id, version: input.version },
      data: {
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
        ...(input.designationId !== undefined ? { designationId: input.designationId } : {}),
        ...(input.reportingManagerId !== undefined ? { reportingManagerId: input.reportingManagerId } : {}),
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.middleName !== undefined ? { middleName: input.middleName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.preferredName !== undefined ? { preferredName: input.preferredName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.personalEmail !== undefined ? { personalEmail: input.personalEmail || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.alternatePhone !== undefined ? { alternatePhone: input.alternatePhone } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup } : {}),
        ...(input.nationality !== undefined ? { nationality: input.nationality } : {}),
        ...(input.maritalStatus !== undefined ? { maritalStatus: input.maritalStatus } : {}),
        ...(input.fatherName !== undefined ? { fatherName: input.fatherName } : {}),
        ...(input.motherName !== undefined ? { motherName: input.motherName } : {}),
        ...(input.spouseName !== undefined ? { spouseName: input.spouseName } : {}),
        ...(input.emergencyContact !== undefined ? { emergencyContact: input.emergencyContact as Prisma.InputJsonValue } : {}),
        ...(input.permanentAddress !== undefined ? { permanentAddress: input.permanentAddress as Prisma.InputJsonValue } : {}),
        ...(input.currentAddress !== undefined ? { currentAddress: input.currentAddress as Prisma.InputJsonValue } : {}),
        ...(identityUpdate !== undefined ? { identityDocuments: identityUpdate as Prisma.InputJsonValue } : {}),
        ...(input.dateOfJoining !== undefined ? { dateOfJoining: input.dateOfJoining } : {}),
        ...(input.confirmationDate !== undefined ? { confirmationDate: input.confirmationDate } : {}),
        ...(input.employmentType !== undefined ? { employmentType: input.employmentType } : {}),
        ...(input.employmentStatus !== undefined ? { employmentStatus: input.employmentStatus } : {}),
        ...(input.probationStatus !== undefined ? { probationStatus: input.probationStatus } : {}),
        ...(input.noticePeriodDays !== undefined ? { noticePeriodDays: input.noticePeriodDays } : {}),
        ...(input.workLocation !== undefined ? { workLocation: input.workLocation } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
      include: employeeInclude,
    });

    for (const change of changes) {
      await this.timeline.record({ employeeId: updated.id, ...change, actorUserId });
    }
    if (changes.length === 0) {
      await this.timeline.record({ employeeId: updated.id, eventType: "employee_updated", title: "Profile updated", actorUserId });
    }

    return this.toProfile(updated, true);
  }

  async getTimeline(employeeId: string): Promise<EmployeeTimelineItem[]> {
    return this.timeline.list(employeeId);
  }

  private toProfile(
    emp: Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>,
    maskIdentity: boolean,
  ): EmployeeProfile {
    const rawIdentity = (emp.identityDocuments ?? {}) as Record<string, string | null>;
    const identity = maskIdentity
      ? {
          aadhaar: rawIdentity.aadhaar ? dataMaskingService.maskAadhaar("************") : null,
          pan: rawIdentity.pan ? dataMaskingService.maskPan("********") : null,
          passport: rawIdentity.passport ? "••••••••" : null,
          passportExpiry: rawIdentity.passportExpiry ?? null,
          drivingLicence: rawIdentity.drivingLicence ? "••••••••" : null,
          drivingLicenceExpiry: rawIdentity.drivingLicenceExpiry ?? null,
          voterId: rawIdentity.voterId ? "••••••••" : null,
          uan: rawIdentity.uan ? "••••••••" : null,
          esicNumber: rawIdentity.esicNumber ? "••••••••" : null,
        }
      : rawIdentity;

    return {
      id: emp.id,
      employeeCode: emp.employeeCode,
      photoFileId: emp.photoFileId,
      firstName: emp.firstName,
      middleName: emp.middleName,
      lastName: emp.lastName,
      preferredName: emp.preferredName,
      fullName: fullName(emp.firstName, emp.middleName, emp.lastName),
      gender: emp.gender,
      dateOfBirth: formatDate(emp.dateOfBirth),
      bloodGroup: emp.bloodGroup,
      nationality: emp.nationality,
      maritalStatus: emp.maritalStatus,
      fatherName: emp.fatherName,
      motherName: emp.motherName,
      spouseName: emp.spouseName,
      email: emp.email,
      personalEmail: emp.personalEmail,
      phone: emp.phone,
      alternatePhone: emp.alternatePhone,
      emergencyContact: (emp.emergencyContact ?? {}) as EmployeeProfile["emergencyContact"],
      permanentAddress: (emp.permanentAddress ?? {}) as EmployeeProfile["permanentAddress"],
      currentAddress: (emp.currentAddress ?? {}) as EmployeeProfile["currentAddress"],
      identityDocuments: identity as EmployeeProfile["identityDocuments"],
      dateOfJoining: formatDate(emp.dateOfJoining)!,
      confirmationDate: formatDate(emp.confirmationDate),
      dateOfSeparation: formatDate(emp.dateOfSeparation),
      employmentType: emp.employmentType,
      employmentStatus: emp.employmentStatus,
      probationStatus: emp.probationStatus,
      noticePeriodDays: emp.noticePeriodDays,
      workLocation: emp.workLocation,
      branchId: emp.branchId,
      branchName: emp.branch.name,
      departmentId: emp.departmentId,
      departmentName: emp.department.name,
      designationId: emp.designationId,
      designationName: emp.designation.name,
      designationLevel: emp.designation.level,
      reportingManagerId: emp.reportingManagerId,
      reportingManagerName: emp.reportingManager
        ? fullName(emp.reportingManager.firstName, emp.reportingManager.middleName, emp.reportingManager.lastName)
        : null,
      status: emp.status,
      remarks: emp.remarks,
      version: emp.version,
      createdAt: emp.createdAt.toISOString(),
      updatedAt: emp.updatedAt.toISOString(),
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createEmployeeService(companyId: string) {
  return new EmployeeService(companyId);
}
