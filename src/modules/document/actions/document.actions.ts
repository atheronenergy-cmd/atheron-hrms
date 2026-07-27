"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/infrastructure/auth/server";
import { requirePermission } from "@/infrastructure/authorization/server/guards";
import {
  getDocumentActorMeta,
  recordDocumentAudit,
} from "@/modules/document/application/document-audit.service";
import { documentAccessService } from "@/modules/document/application/document-access.service";
import { createDocumentVerificationService } from "@/modules/document/application/document-verification.service";
import { createEmployeeDocumentService } from "@/modules/document/application/employee-document.service";
import { DOCUMENT_ROUTES } from "@/modules/document/domain/types";
import {
  updateDocumentSchema,
  uploadDocumentSchema,
  verifyDocumentSchema,
} from "@/modules/document/validation/schemas";
import { EMPLOYEE_ROUTES } from "@/modules/employee/domain/types";
import { createEmployeeTimelineService } from "@/modules/employee/application/employee-timeline.service";
import { isAppError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export type DocumentActionResult<T = void> = {
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
    documents: createEmployeeDocumentService(companyId),
    verification: createDocumentVerificationService(companyId),
  };
}

export async function uploadEmployeeDocumentAction(formData: FormData): Promise<DocumentActionResult<{ id: string; fileUrl: string }>> {
  try {
    await requirePermission(PERMISSIONS.DOCUMENT.FILE.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, message: "No file provided" };

    const parsed = uploadDocumentSchema.safeParse({
      employeeId: formData.get("employeeId"),
      categoryId: formData.get("categoryId") || undefined,
      categoryCode: formData.get("categoryCode") || undefined,
      documentType: formData.get("documentType"),
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      documentNumber: formData.get("documentNumber") || undefined,
      issueDate: formData.get("issueDate") || undefined,
      expiryDate: formData.get("expiryDate") || undefined,
      issuingAuthority: formData.get("issuingAuthority") || undefined,
      remarks: formData.get("remarks") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await getDocumentActorMeta();
    const result = await services(companyId).documents.upload(
      parsed.data,
      { name: file.name, mimeType: file.type, data: buffer },
      auth.id,
    );

    await recordDocumentAudit("document_uploaded", {
      companyId,
      actorUserId: auth.id,
      entityId: result.id,
      ...meta,
      metadata: { title: parsed.data.title },
    });

    revalidatePath(EMPLOYEE_ROUTES.detail(parsed.data.employeeId));
    revalidatePath(DOCUMENT_ROUTES.employeeDocuments(parsed.data.employeeId));
    return { success: true, message: "Document uploaded.", data: result };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Upload failed." };
  }
}

export async function uploadEmployeePhotoAction(formData: FormData): Promise<DocumentActionResult<{ url: string }>> {
  try {
    await requirePermission(PERMISSIONS.DOCUMENT.FILE.CREATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const employeeId = String(formData.get("employeeId") ?? "");
    const file = formData.get("file") as File | null;
    if (!file || !employeeId) return { success: false, message: "Employee and file required" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await getDocumentActorMeta();
    const result = await services(companyId).documents.uploadPhoto(
      employeeId,
      { name: file.name, mimeType: file.type, data: buffer },
      auth.id,
    );

    await recordDocumentAudit("photo_uploaded", {
      companyId,
      actorUserId: auth.id,
      entityId: employeeId,
      ...meta,
    });

    revalidatePath(EMPLOYEE_ROUTES.detail(employeeId));
    return { success: true, message: "Photo updated.", data: { url: result.url } };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Photo upload failed." };
  }
}

export async function deleteEmployeePhotoAction(employeeId: string): Promise<DocumentActionResult> {
  try {
    await requirePermission(PERMISSIONS.DOCUMENT.FILE.DELETE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const meta = await getDocumentActorMeta();
    await services(companyId).documents.deletePhoto(employeeId, auth.id);

    await recordDocumentAudit("photo_deleted", { companyId, actorUserId: auth.id, entityId: employeeId, ...meta });
    revalidatePath(EMPLOYEE_ROUTES.detail(employeeId));
    return { success: true, message: "Photo removed." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Delete failed." };
  }
}

export async function verifyDocumentAction(input: unknown): Promise<DocumentActionResult> {
  try {
    await requirePermission(PERMISSIONS.DOCUMENT.FILE.VERIFY);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = verifyDocumentSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    const meta = await getDocumentActorMeta();
    await services(companyId).verification.verify(parsed.data, auth.id);

    const doc = await services(companyId).documents.getById(parsed.data.id);
    await createEmployeeTimelineService(companyId).record({
      employeeId: doc.employeeId,
      eventType: parsed.data.status === "verified" ? "document_uploaded" : "status_changed",
      title: parsed.data.status === "verified" ? "Document verified" : "Document rejected",
      description: doc.title,
      actorUserId: auth.id,
    });

    await recordDocumentAudit(parsed.data.status === "verified" ? "document_verified" : "document_rejected", {
      companyId,
      actorUserId: auth.id,
      entityId: parsed.data.id,
      ...meta,
    });

    revalidatePath(EMPLOYEE_ROUTES.detail(doc.employeeId));
    return { success: true, message: parsed.data.status === "verified" ? "Document verified." : "Document rejected." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Verification failed." };
  }
}

export async function deleteDocumentAction(id: string, version: number): Promise<DocumentActionResult> {
  try {
    await requirePermission(PERMISSIONS.DOCUMENT.FILE.DELETE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const doc = await services(companyId).documents.getById(id);
    const meta = await getDocumentActorMeta();

    await services(companyId).documents.softDelete(id, version, auth.id);
    await recordDocumentAudit("document_deleted", { companyId, actorUserId: auth.id, entityId: id, ...meta });

    revalidatePath(EMPLOYEE_ROUTES.detail(doc.employeeId));
    return { success: true, message: "Document deleted." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Delete failed." };
  }
}

export async function downloadDocumentAction(documentId: string): Promise<DocumentActionResult<{ base64: string; mimeType: string; fileName: string }>> {
  try {
    await requirePermission(PERMISSIONS.DOCUMENT.FILE.DOWNLOAD);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const doc = await services(companyId).documents.getById(documentId);
    const meta = await getDocumentActorMeta();

    const { createFileStorageService } = await import("@/infrastructure/storage/file-storage.service");
    const { buffer, mimeType, originalName } = await createFileStorageService().getDownloadBuffer(doc.fileId, companyId);

    const sensitive = doc.categoryCode === "identity";
    await documentAccessService.logAccess({
      documentId,
      fileId: doc.fileId,
      userId: auth.id,
      companyId,
      action: "download",
      sensitive,
      ...meta,
    });

    return {
      success: true,
      message: "Download ready.",
      data: { base64: buffer.toString("base64"), mimeType, fileName: originalName },
    };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Download failed." };
  }
}

export async function updateDocumentAction(input: unknown): Promise<DocumentActionResult> {
  try {
    await requirePermission(PERMISSIONS.DOCUMENT.FILE.UPDATE);
    const auth = await requireAuth();
    const companyId = requireCompanyId(auth.companyId);
    const parsed = updateDocumentSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Validation failed" };

    await services(companyId).documents.update(parsed.data, auth.id);
    const doc = await services(companyId).documents.getById(parsed.data.id);
    revalidatePath(EMPLOYEE_ROUTES.detail(doc.employeeId));
    return { success: true, message: "Document updated." };
  } catch (error) {
    return { success: false, message: isAppError(error) ? error.message : "Update failed." };
  }
}
