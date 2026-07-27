/**
 * QR Attendance module verification.
 * Run: npx tsx scripts/verify-qr-attendance.ts
 */
import { qrCodeSecurityService } from "../src/modules/attendance/qr/application/qr-code-security.service";
import {
  generateQrSchema,
  scanQrSchema,
  validateQrSchema,
} from "../src/modules/attendance/qr/validation/schemas";
import { PERMISSIONS } from "../src/shared/permissions/definitions";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

console.log("\n=== QR Attendance Module Verification ===\n");

assert(PERMISSIONS.QR.CODE.READ === "qr.code.read", "View permission");
assert(PERMISSIONS.QR.CODE.CREATE === "qr.code.create", "Generate permission");
assert(PERMISSIONS.QR.CODE.REVOKE === "qr.code.revoke", "Revoke permission");
assert(PERMISSIONS.QR.SCAN.CREATE === "qr.scan.create", "Scan permission");
assert(PERMISSIONS.QR.POLICY.MANAGE === "qr.policy.manage", "Manage permission");

assert(generateQrSchema.safeParse({ name: "Office", codeType: "office", expirySeconds: 60 }).success, "Generate schema");
assert(validateQrSchema.safeParse({ token: "abc123token4567890" }).success, "Validate schema");
assert(scanQrSchema.safeParse({ token: "abc123token4567890", punchType: "in" }).success, "Scan schema");

const companyId = "00000000-0000-4000-8000-000000000001";
const qrCodeId = "00000000-0000-4000-8000-000000000002";
const payload = qrCodeSecurityService.buildPayload({
  companyId,
  qrCodeId,
  codeType: "branch",
  branchId: "00000000-0000-4000-8000-000000000003",
  expirySeconds: 60,
});
const sealed = qrCodeSecurityService.sealPayload(payload);
const opened = qrCodeSecurityService.openToken(sealed.token);
assert(opened.qid === qrCodeId, "QR token round-trip preserves qr id");
assert(opened.cid === companyId, "QR token round-trip preserves company id");
assert(opened.nonce === payload.nonce, "QR token round-trip preserves nonce");

const expiredPayload = qrCodeSecurityService.buildPayload({
  companyId,
  qrCodeId,
  codeType: "office",
  expirySeconds: -10,
});
assert(expiredPayload.exp < Math.floor(Date.now() / 1000), "Expired payload has past exp");

const tampered = qrCodeSecurityService.signPayload(JSON.stringify({ ...payload, cid: "tampered" }));
assert(tampered !== sealed.signature, "Signature changes when payload tampered");

console.log("\n=== All QR attendance checks passed ===\n");
