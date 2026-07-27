import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { v7 as uuidv7 } from "uuid";

import { prisma } from "@/infrastructure/database/prisma-client";
import {
  decryptValue,
  encryptValue,
  hashRecoveryCode,
} from "@/modules/security/application/encryption.service";

const BACKUP_CODE_COUNT = 10;
const PENDING_2FA_TTL_MS = 5 * 60 * 1000;

function generateBackupCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${part()}`;
}

export class TwoFactorService {
  async generateSetup(userId: string, email: string) {
    const secret = generateSecret();
    const otpauth = generateURI({ issuer: "Atheron HRMS", label: email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptValue(secret) },
    });

    return { secret, qrCodeDataUrl, otpauth };
  }

  async verifyTotp(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });
    if (!user?.twoFactorSecret) return false;

    const secret = decryptValue(user.twoFactorSecret);
    const result = await verify({ secret, token: token.replace(/\s/g, "") });
    return result.valid === true;
  }

  async enableTwoFactor(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const valid = await this.verifyTotp(userId, token);
    if (!valid) throw new Error("Invalid verification code");

    const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());

    await prisma.$transaction([
      prisma.userRecoveryCode.deleteMany({ where: { userId } }),
      ...backupCodes.map((code) =>
        prisma.userRecoveryCode.create({
          data: { userId, codeHash: hashRecoveryCode(code) },
        }),
      ),
      prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      }),
    ]);

    return { backupCodes };
  }

  async disableTwoFactor(userId: string, token: string): Promise<void> {
    const valid = await this.verifyTotp(userId, token);
    if (!valid) throw new Error("Invalid verification code");

    await prisma.$transaction([
      prisma.userRecoveryCode.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      }),
    ]);
  }

  async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    const valid = await this.verifyTotp(userId, token);
    if (!valid) throw new Error("Invalid verification code");

    const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());
    await prisma.$transaction([
      prisma.userRecoveryCode.deleteMany({ where: { userId } }),
      ...backupCodes.map((code) =>
        prisma.userRecoveryCode.create({
          data: { userId, codeHash: hashRecoveryCode(code) },
        }),
      ),
    ]);
    return backupCodes;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const hash = hashRecoveryCode(code);
    const entry = await prisma.userRecoveryCode.findFirst({
      where: { userId, codeHash: hash, usedAt: null },
    });
    if (!entry) return false;

    await prisma.userRecoveryCode.update({
      where: { id: entry.id },
      data: { usedAt: new Date() },
    });
    return true;
  }

  async createPendingAuth(params: {
    userId: string;
    rememberMe: boolean;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const token = uuidv7();
    const expires = new Date(Date.now() + PENDING_2FA_TTL_MS);

    await prisma.pendingTwoFactorAuth.deleteMany({
      where: { userId: params.userId, expires: { lt: new Date() } },
    });

    await prisma.pendingTwoFactorAuth.create({
      data: {
        userId: params.userId,
        token,
        rememberMe: params.rememberMe,
        expires,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return { token, expires };
  }

  async consumePendingAuth(token: string) {
    const pending = await prisma.pendingTwoFactorAuth.findUnique({ where: { token } });
    if (!pending || pending.expires < new Date()) return null;

    await prisma.pendingTwoFactorAuth.delete({ where: { id: pending.id } });
    return pending;
  }

  async verifyLoginOtp(userId: string, otp: string, useBackupCode: boolean): Promise<boolean> {
    if (useBackupCode) return this.verifyBackupCode(userId, otp);
    return this.verifyTotp(userId, otp);
  }

  async getTwoFactorStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        recoveryCodes: {
          where: { usedAt: null },
          select: { id: true },
        },
      },
    });
    return {
      enabled: user?.twoFactorEnabled ?? false,
      remainingBackupCodes: user?.recoveryCodes.length ?? 0,
    };
  }
}

export const twoFactorService = new TwoFactorService();
