import {
  generateSecureToken,
  getPasswordResetExpiry,
  hashToken,
} from "@/infrastructure/auth/token.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { emailProvider } from "@/infrastructure/email/email-provider";
import { passwordResetEmailTemplate } from "@/infrastructure/email/templates/auth-email.templates";
import { recordUserAudit } from "@/modules/user/application/user-audit.service";
import { createUserAdminRepository } from "@/modules/user/infrastructure/repositories/prisma-user-admin.repository";
import { AUTH_CONFIG } from "@/shared/constants/auth";
import { NotFoundError } from "@/shared/errors";

export class UserSecurityService {
  constructor(private readonly companyId?: string) {}

  private repo() {
    return createUserAdminRepository(this.companyId);
  }

  async resetPassword(userId: string, actorUserId: string): Promise<void> {
    const user = await this.repo().findByIdWithRoles(userId);
    if (!user) throw new NotFoundError("User", userId);

    const plainToken = generateSecureToken();
    const hashedToken = hashToken(plainToken);

    await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId, token: hashedToken, expires: getPasswordResetExpiry() },
    });

    const template = passwordResetEmailTemplate({
      name: user.name,
      token: plainToken,
      expiresHours: AUTH_CONFIG.passwordResetExpiryHours,
    });
    await emailProvider.send(user.email, template.subject, template.body);

    await recordUserAudit("user_password_reset", {
      companyId: user.companyId,
      actorUserId,
      targetUserId: userId,
    });
  }

  async revokeAllSessions(userId: string, actorUserId: string): Promise<number> {
    const user = await this.repo().findByIdWithRoles(userId);
    if (!user) throw new NotFoundError("User", userId);

    const result = await prisma.session.deleteMany({ where: { userId } });

    await recordUserAudit("user_sessions_revoked", {
      companyId: user.companyId,
      actorUserId,
      targetUserId: userId,
      metadata: { count: result.count },
    });

    return result.count;
  }

  async getLoginHistory(userId: string, limit = 20) {
    return this.repo().getLoginHistory(userId, limit);
  }

  async getSessions(userId: string) {
    return this.repo().getSessions(userId);
  }

  async getActivityLogs(userId: string, limit = 20) {
    return this.repo().getActivityLogs(userId, limit);
  }
}

export const createUserSecurityService = (companyId?: string) =>
  new UserSecurityService(companyId);
