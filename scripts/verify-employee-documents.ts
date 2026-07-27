/**
 * Employee Document module verification.
 * Run: npx tsx scripts/verify-employee-documents.ts
 */
import { DOCUMENT_ROUTES } from "../src/modules/document/domain/types";
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  verifyDocumentSchema,
} from "../src/modules/document/validation/schemas";
import { buildStorageKey, isAllowedMimeType } from "../src/shared/utils/file.utils";
import { PERMISSIONS } from "../src/shared/permissions/definitions";
import { DEFAULT_DOCUMENT_CATEGORIES, VERIFICATION_STATUS_LABELS } from "../src/shared/constants/files";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== Employee Document Module Verification ===\n");

assert(PERMISSIONS.DOCUMENT.FILE.READ === "document.file.read", "Document view permission");
assert(PERMISSIONS.DOCUMENT.FILE.VERIFY === "document.file.verify", "Document verify permission");
assert(PERMISSIONS.DOCUMENT.FILE.DOWNLOAD === "document.file.download", "Document download permission");
assert(DEFAULT_DOCUMENT_CATEGORIES.length === 8, "Eight default document categories");
assert(VERIFICATION_STATUS_LABELS.pending_verification === "Pending Verification", "Verification status labels");

const key = buildStorageKey("company-id", "document", "employee-id", "file.pdf");
assert(key.includes("company-id/document/employee-id"), "Storage key abstraction");

assert(isAllowedMimeType("application/pdf", ["application/pdf"]), "MIME validation");

const upload = uploadDocumentSchema.safeParse({
  employeeId: "00000000-0000-4000-8000-000000000001",
  documentType: "pan_card",
  title: "PAN Card",
  categoryCode: "identity",
});
assert(upload.success, "UploadDocumentSchema accepts valid input");

const verify = verifyDocumentSchema.safeParse({
  id: "00000000-0000-4000-8000-000000000002",
  version: 1,
  status: "verified",
});
assert(verify.success, "VerifyDocumentSchema accepts valid input");

const update = updateDocumentSchema.safeParse({
  id: "00000000-0000-4000-8000-000000000002",
  version: 1,
  title: "Updated title",
});
assert(update.success, "UpdateDocumentSchema accepts partial update");

assert(DOCUMENT_ROUTES.employeeDocuments("abc") === "/dashboard/employees/abc/documents", "Document route helper");

console.log("\n=== All employee document checks passed ===\n");
