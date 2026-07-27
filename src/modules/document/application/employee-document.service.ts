import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { createFileStorageService } from "@/infrastructure/storage/file-storage.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createEmployeeTimelineService } from "@/modules/employee/application/employee-timeline.service";
import type { DocumentDetail, DocumentListItem } from "@/modules/document/domain/types";
import type {
  DocumentSearchInput,
  UpdateDocumentInput,
  UploadDocumentInput,
} from "@/modules/document/validation/schemas";
import { DOCUMENT_TYPE_LABELS } from "@/shared/constants/files";
import { NotFoundError } from "@/shared/errors";
import { buildPaginatedResult } from "@/shared/pagination";

import { createDocumentCategoryService } from "./document-category.service";

const documentInclude = {
  file: true,
  category: { select: { code: true, name: true } },
} satisfies Prisma.EmployeeDocumentInclude;

export class EmployeeDocumentService extends BaseRepository {
  private storage = createFileStorageService();
  private timeline = createEmployeeTimelineService(this.companyId);

  async list(query: DocumentSearchInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const orderBy = { [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc" } as Prisma.EmployeeDocumentOrderByWithRelationInput;

    const where: Prisma.EmployeeDocumentWhereInput = {
      companyId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.categoryCode
        ? { category: { code: query.categoryCode } }
        : {}),
      ...(query.documentType ? { documentType: query.documentType } : {}),
      ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { documentType: { contains: query.search, mode: "insensitive" } },
              { documentNumber: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.employeeDocument.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: documentInclude,
      }),
      prisma.employeeDocument.count({ where }),
    ]);

    const items: DocumentListItem[] = rows.map((d) => this.toListItem(d));
    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async getById(id: string): Promise<DocumentDetail> {
    const companyId = this.requireCompanyId();
    const doc = await prisma.employeeDocument.findFirst({
      where: { id, companyId, deletedAt: null },
      include: documentInclude,
    });
    if (!doc) throw new NotFoundError("Document", id);
    const fileUrl = await this.storage.getSignedUrl(doc.fileId, companyId);
    return { ...this.toListItem(doc), ...this.toDetailFields(doc, fileUrl) };
  }

  async upload(
    input: UploadDocumentInput,
    file: { name: string; mimeType: string; data: Buffer },
    actorUserId: string,
  ) {
    const companyId = this.requireCompanyId();
    await this.assertEmployee(input.employeeId, companyId);

    let categoryId = input.categoryId;
    if (!categoryId && input.categoryCode) {
      const cat = await createDocumentCategoryService(companyId).findByCode(input.categoryCode);
      categoryId = cat?.id;
    }

    const stored = await this.storage.store({
      companyId,
      category: "document",
      entityId: input.employeeId,
      originalName: file.name,
      mimeType: file.mimeType,
      data: file.data,
      actorUserId,
    });

    const doc = await prisma.employeeDocument.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        fileId: stored.id,
        categoryId: categoryId ?? null,
        documentType: input.documentType,
        title: input.title,
        description: input.description ?? null,
        documentNumber: input.documentNumber ?? null,
        issueDate: input.issueDate ?? null,
        expiryDate: input.expiryDate ?? null,
        issuingAuthority: input.issuingAuthority ?? null,
        remarks: input.remarks ?? null,
        verificationStatus: "pending_verification",
        createdBy: actorUserId,
      },
      include: documentInclude,
    });

    await this.timeline.record({
      employeeId: input.employeeId,
      eventType: "document_uploaded",
      title: "Document uploaded",
      description: input.title,
      actorUserId,
      metadata: { documentId: doc.id, documentType: input.documentType },
    });

    return { id: doc.id, fileUrl: stored.url };
  }

  async uploadPhoto(
    employeeId: string,
    file: { name: string; mimeType: string; data: Buffer },
    actorUserId: string,
  ) {
    const companyId = this.requireCompanyId();
    const employee = await this.assertEmployee(employeeId, companyId);

    if (employee.photoFileId) {
      await this.storage.softDelete(employee.photoFileId, companyId, actorUserId);
    }

    const stored = await this.storage.store({
      companyId,
      category: "employee_photo",
      entityId: employeeId,
      originalName: file.name,
      mimeType: file.mimeType,
      data: file.data,
      actorUserId,
      metadata: { thumbnailReady: false },
    });

    await prisma.employee.update({
      where: { id: employeeId },
      data: { photoFileId: stored.id, updatedBy: actorUserId, version: { increment: 1 } },
    });

    return { fileId: stored.id, url: stored.url };
  }

  async deletePhoto(employeeId: string, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const employee = await this.assertEmployee(employeeId, companyId);
    if (!employee.photoFileId) return;

    await this.storage.softDelete(employee.photoFileId, companyId, actorUserId);
    await prisma.employee.update({
      where: { id: employeeId },
      data: { photoFileId: null, updatedBy: actorUserId, version: { increment: 1 } },
    });
  }

  async getPhotoUrl(employeeId: string) {
    const companyId = this.requireCompanyId();
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
      select: { photoFileId: true },
    });
    if (!employee?.photoFileId) return null;
    return this.storage.getSignedUrl(employee.photoFileId, companyId);
  }

  async update(input: UpdateDocumentInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.employeeDocument.findFirst({
      where: { id: input.id, companyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Document", input.id);

    await prisma.employeeDocument.update({
      where: { id: input.id, version: input.version },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.documentType !== undefined ? { documentType: input.documentType } : {}),
        ...(input.documentNumber !== undefined ? { documentNumber: input.documentNumber } : {}),
        ...(input.issueDate !== undefined ? { issueDate: input.issueDate } : {}),
        ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
        ...(input.issuingAuthority !== undefined ? { issuingAuthority: input.issuingAuthority } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        updatedBy: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  async softDelete(id: string, version: number, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const doc = await prisma.employeeDocument.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!doc) throw new NotFoundError("Document", id);

    await prisma.employeeDocument.update({
      where: { id, version },
      data: {
        deletedAt: new Date(),
        deletedBy: actorUserId,
        status: "inactive",
        verificationStatus: "archived",
        version: { increment: 1 },
      },
    });
  }

  async getStats(employeeId?: string) {
    const companyId = this.requireCompanyId();
    const base = { companyId, deletedAt: null, ...(employeeId ? { employeeId } : {}) };
    const [totalDocuments, pendingVerification, expiringSoon, expired] = await Promise.all([
      prisma.employeeDocument.count({ where: base }),
      prisma.employeeDocument.count({ where: { ...base, verificationStatus: "pending_verification" } }),
      prisma.employeeDocument.count({
        where: {
          ...base,
          expiryDate: { gte: new Date(), lte: addDays(new Date(), 30) },
        },
      }),
      prisma.employeeDocument.count({ where: { ...base, verificationStatus: "expired" } }),
    ]);
    return { totalDocuments, pendingVerification, expiringSoon, expired };
  }

  private async assertEmployee(employeeId: string, companyId: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, deletedAt: null } });
    if (!employee) throw new NotFoundError("Employee", employeeId);
    return employee;
  }

  private toListItem(
    d: Prisma.EmployeeDocumentGetPayload<{ include: typeof documentInclude }>,
  ): DocumentListItem {
    return {
      id: d.id,
      employeeId: d.employeeId,
      title: d.title,
      documentType: d.documentType,
      documentTypeLabel: DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType,
      categoryCode: d.category?.code ?? null,
      categoryName: d.category?.name ?? null,
      fileName: d.file.originalName,
      fileSize: Number(d.file.sizeBytes),
      mimeType: d.file.mimeType,
      uploadedAt: d.createdAt.toISOString(),
      expiryDate: d.expiryDate ? d.expiryDate.toISOString().slice(0, 10) : null,
      verificationStatus: d.verificationStatus,
      uploadedByName: null,
      version: d.version,
    };
  }

  private toDetailFields(
    d: Prisma.EmployeeDocumentGetPayload<{ include: typeof documentInclude }>,
    fileUrl: string,
  ) {
    return {
      description: d.description,
      documentNumber: d.documentNumber,
      issueDate: d.issueDate ? d.issueDate.toISOString().slice(0, 10) : null,
      issuingAuthority: d.issuingAuthority,
      fileId: d.fileId,
      fileUrl,
      remarks: d.remarks,
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function createEmployeeDocumentService(companyId: string) {
  return new EmployeeDocumentService(companyId);
}
