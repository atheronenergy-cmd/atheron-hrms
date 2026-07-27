import { randomUUID } from "crypto";
import QRCode from "qrcode";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import { qrCodeSecurityService } from "@/modules/attendance/qr/application/qr-code-security.service";
import type { QrCodeListItem } from "@/modules/attendance/qr/domain/types";
import type { GenerateQrInput } from "@/modules/attendance/qr/validation/schemas";

export class QRGeneratorService extends BaseRepository {
  async generate(input: GenerateQrInput, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const expiresAt = new Date(Date.now() + input.expirySeconds * 1000);
    const placeholderId = randomUUID();
    const payload = qrCodeSecurityService.buildPayload({
      companyId,
      qrCodeId: placeholderId,
      codeType: input.codeType,
      branchId: input.branchId,
      departmentId: input.departmentId,
      shiftId: input.shiftId,
      expirySeconds: input.expirySeconds,
    });

    const sealed = qrCodeSecurityService.sealPayload({ ...payload, qid: placeholderId });
    const record = await prisma.qrCode.create({
      data: {
        id: placeholderId,
        companyId,
        codeType: input.codeType,
        name: input.name,
        branchId: input.branchId ?? null,
        departmentId: input.departmentId ?? null,
        shiftId: input.shiftId ?? null,
        nonceHash: sealed.nonceHash,
        signature: sealed.signature,
        expiresAt,
        expirySeconds: input.expirySeconds,
        status: "active",
        createdBy: actorUserId,
      },
    });

    const finalPayload = qrCodeSecurityService.buildPayload({
      companyId,
      qrCodeId: record.id,
      codeType: input.codeType,
      branchId: input.branchId,
      departmentId: input.departmentId,
      shiftId: input.shiftId,
      expirySeconds: input.expirySeconds,
      nonce: payload.nonce,
    });
    const finalSealed = qrCodeSecurityService.sealPayload(finalPayload);
    await prisma.qrCode.update({
      where: { id: record.id },
      data: { signature: finalSealed.signature, nonceHash: finalSealed.nonceHash },
    });

    const qrDataUrl = await QRCode.toDataURL(finalSealed.token, { width: 280, margin: 2 });

    return {
      qrCode: this.toListItem(record),
      token: finalSealed.token,
      qrDataUrl,
      expiresAt: record.expiresAt.toISOString(),
    };
  }

  async revoke(qrCodeId: string, actorUserId: string) {
    const companyId = this.requireCompanyId();
    return prisma.qrCode.updateMany({
      where: { id: qrCodeId, companyId, status: "active" },
      data: { status: "revoked", revokedAt: new Date(), revokedBy: actorUserId },
    });
  }

  async regenerate(qrCodeId: string, actorUserId: string) {
    const companyId = this.requireCompanyId();
    const existing = await prisma.qrCode.findFirst({ where: { id: qrCodeId, companyId } });
    if (!existing) throw new Error("QR code not found");
    await this.revoke(qrCodeId, actorUserId);
    return this.generate(
      {
        codeType: existing.codeType,
        name: `${existing.name} (regenerated)`,
        branchId: existing.branchId ?? undefined,
        departmentId: existing.departmentId ?? undefined,
        shiftId: existing.shiftId ?? undefined,
        expirySeconds: existing.expirySeconds,
      },
      actorUserId,
    );
  }

  async listActive() {
    const companyId = this.requireCompanyId();
    const now = new Date();
    const rows = await prisma.qrCode.findMany({
      where: {
        companyId,
        status: "active",
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((r) => this.toListItem(r));
  }

  async listExpired() {
    const companyId = this.requireCompanyId();
    const now = new Date();
    const rows = await prisma.qrCode.findMany({
      where: {
        companyId,
        OR: [{ status: "expired" }, { status: "used" }, { expiresAt: { lte: now } }],
      },
      orderBy: { expiresAt: "desc" },
      take: 50,
    });
    return rows.map((r) => this.toListItem(r));
  }

  private toListItem(r: {
    id: string;
    name: string;
    codeType: string;
    branchId: string | null;
    departmentId: string | null;
    shiftId: string | null;
    status: string;
    expiresAt: Date;
    expirySeconds: number;
    createdAt: Date;
  }): QrCodeListItem {
    return {
      id: r.id,
      name: r.name,
      codeType: r.codeType,
      branchId: r.branchId,
      departmentId: r.departmentId,
      shiftId: r.shiftId,
      status: r.status,
      expiresAt: r.expiresAt.toISOString(),
      expirySeconds: r.expirySeconds,
      createdAt: r.createdAt.toISOString(),
    };
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createQRGeneratorService(companyId: string) {
  return new QRGeneratorService(companyId);
}
