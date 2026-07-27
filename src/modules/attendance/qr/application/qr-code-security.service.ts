import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";

import { decryptValue, encryptValue } from "@/modules/security/application/encryption.service";
import type { QrPayload } from "@/modules/attendance/qr/domain/types";
import { ValidationError } from "@/shared/errors";

function getSigningKey(): Buffer {
  const raw = process.env.QR_SIGNING_KEY ?? process.env.ENCRYPTION_KEY ?? "dev-only-32-byte-key-change-me!!";
  return createHash("sha256").update(`qr-attendance:${raw}`).digest();
}

export class QRCodeSecurityService {
  createNonce(): string {
    return randomBytes(16).toString("hex");
  }

  hashNonce(nonce: string): string {
    return createHash("sha256").update(nonce).digest("hex");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  signPayload(payloadJson: string): string {
    return createHmac("sha256", getSigningKey()).update(payloadJson).digest("base64url");
  }

  verifySignature(payloadJson: string, signature: string): boolean {
    const expected = this.signPayload(payloadJson);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  sealPayload(payload: QrPayload): { token: string; signature: string; nonceHash: string } {
    const payloadJson = JSON.stringify(payload);
    const signature = this.signPayload(payloadJson);
    const sealed = encryptValue(JSON.stringify({ p: payload, s: signature }));
    const token = Buffer.from(sealed, "utf8").toString("base64url");
    return { token, signature, nonceHash: this.hashNonce(payload.nonce) };
  }

  openToken(token: string): QrPayload {
    try {
      const sealed = Buffer.from(token, "base64url").toString("utf8");
      const parsed = JSON.parse(decryptValue(sealed)) as { p: QrPayload; s: string };
      const payloadJson = JSON.stringify(parsed.p);
      if (!this.verifySignature(payloadJson, parsed.s)) {
        throw new ValidationError("Invalid QR signature");
      }
      return parsed.p;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError("Invalid QR payload");
    }
  }

  buildPayload(params: {
    companyId: string;
    qrCodeId: string;
    codeType: string;
    branchId?: string | null;
    departmentId?: string | null;
    shiftId?: string | null;
    expirySeconds: number;
    nonce?: string;
  }): QrPayload {
    const now = Math.floor(Date.now() / 1000);
    return {
      v: 1,
      cid: params.companyId,
      qid: params.qrCodeId,
      typ: params.codeType,
      bid: params.branchId ?? undefined,
      did: params.departmentId ?? undefined,
      sid: params.shiftId ?? undefined,
      iat: now,
      exp: now + params.expirySeconds,
      nonce: params.nonce ?? this.createNonce(),
    };
  }
}

export const qrCodeSecurityService = new QRCodeSecurityService();
