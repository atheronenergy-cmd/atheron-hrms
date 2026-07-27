import { v7 as uuidv7 } from "uuid";

import { hashPassword } from "@/infrastructure/auth/password.service";
import {
  generateSecureToken,
  getEmailVerificationExpiry,
  hashToken,
  isTokenExpired,
} from "@/infrastructure/auth/token.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { emailProvider } from "@/infrastructure/email/email-provider";
import { userInvitationEmailTemplate } from "@/infrastructure/email/templates/user-email.templates";
import { recordUserAudit } from "@/modules/user/application/user-audit.service";
import { INVITATION_EXPIRY_HOURS } from "@/modules/user/domain/types";
import type { AcceptInvitationInput } from "@/modules/user/validation/schemas";
import { AuthenticationError, NotFoundError } from "@/shared/errors";

function getInvitationExpiry(): Date {
  return new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);
}

export class InvitationService {
  async sendInvitation(userId: string, invitedBy: string): Promise<void> {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundError("User", userId);

    const plainToken = generateSecureToken();
    const hashedToken = hashToken(plainToken);

    await prisma.userInvitation.deleteMany({ where: { userId, acceptedAt: null } });
    await prisma.userInvitation.create({
      data: {
        id: uuidv7(),
        userId,
        token: hashedToken,
        expires: getInvitationExpiry(),
        invitedBy,
      },
    });

    const template = userInvitationEmailTemplate({
      name: user.name,
      token: plainToken,
      expiresHours: INVITATION_EXPIRY_HOURS,
    });
    await emailProvider.send(user.email, template.subject, template.body);

    await recordUserAudit("user_invitation_sent", {
      companyId: user.companyId,
      actorUserId: invitedBy,
      targetUserId: userId,
    });
  }

  async validateToken(token: string) {
    const hashed = hashToken(token);
    const invitation = await prisma.userInvitation.findFirst({
      where: { token: hashed, acceptedAt: null },
      include: { user: true },
    });

    if (!invitation || isTokenExpired(invitation.expires)) {
      return null;
    }

    return invitation;
  }

  async acceptInvitation(input: AcceptInvitationInput): Promise<void> {
    const invitation = await this.validateToken(input.token);
    if (!invitation) {
      throw new AuthenticationError("This invitation link is invalid or has expired.");
    }

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: invitation.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          emailVerified: new Date(),
          status: "active",
        },
      }),
      prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    await recordUserAudit("user_invitation_accepted", {
      companyId: invitation.user.companyId,
      targetUserId: invitation.userId,
    });
  }

  async resendVerification(userId: string, actorUserId: string): Promise<void> {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundError("User", userId);

    const plainToken = generateSecureToken();
    const hashedToken = hashToken(plainToken);

    await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: hashedToken,
        expires: getEmailVerificationExpiry(),
      },
    });

    const template = userInvitationEmailTemplate({
      name: user.name,
      token: plainToken,
      expiresHours: 24,
    });
    await emailProvider.send(user.email, `Verify your account`, template.body);

    await recordUserAudit("user_invitation_sent", {
      companyId: user.companyId,
      actorUserId,
      targetUserId: userId,
      metadata: { type: "verification_resend" },
    });
  }
}

export const invitationService = new InvitationService();
