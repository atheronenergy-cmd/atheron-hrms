import { USER_ROUTES } from "@/modules/user/domain/types";
import { APP_NAME } from "@/shared/constants/app";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

export function userInvitationEmailTemplate(params: {
  name: string;
  token: string;
  expiresHours: number;
}) {
  const inviteUrl = `${baseUrl}${USER_ROUTES.acceptInvitation}?token=${encodeURIComponent(params.token)}`;

  return {
    subject: `You're invited to ${APP_NAME}`,
    body: `
Hello ${params.name},

You've been invited to join ${APP_NAME}.

Accept your invitation and set your password:
${inviteUrl}

This invitation expires in ${params.expiresHours} hour(s).

— ${APP_NAME} Team
    `.trim(),
  };
}
