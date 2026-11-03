import { createResendEmailProvider } from "@/infrastructure/email/resend-email-provider";
import { BusinessRuleError } from "@/shared/errors";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type EmailSendOptions = {
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  tags?: string[];
};

export interface EmailProvider {
  send(to: string, subject: string, body: string, options?: EmailSendOptions): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(to: string, subject: string, body: string, options?: EmailSendOptions): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new BusinessRuleError("Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM.");
    }
    console.info("[EMAIL]", {
      to,
      subject,
      bodyLength: body.length,
      attachments: options?.attachments?.map((a) => a.filename) ?? [],
    });
  }
}

export function assertEmailDelivery(): void {
  if (process.env.NODE_ENV === "production" && !isEmailConfigured()) {
    throw new BusinessRuleError("Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM.");
  }
}

function buildEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()) {
    return createResendEmailProvider();
  }

  if (process.env.NODE_ENV === "production") {
    console.warn("[EMAIL] RESEND_API_KEY or RESEND_FROM is not set. Outbound email will fail until both are set.");
  }

  return new ConsoleEmailProvider();
}

export const emailProvider: EmailProvider = buildEmailProvider();

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
}

export { createResendEmailProvider, getDefaultFromAddress } from "@/infrastructure/email/resend-email-provider";
