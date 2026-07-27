import { createResendEmailProvider } from "@/infrastructure/email/resend-email-provider";

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
    console.info("[EMAIL]", {
      to,
      subject,
      bodyLength: body.length,
      attachments: options?.attachments?.map((a) => a.filename) ?? [],
    });
  }
}

function buildEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()) {
    return createResendEmailProvider();
  }

  if (process.env.NODE_ENV === "production") {
    console.warn("[EMAIL] RESEND_API_KEY or RESEND_FROM is not set. Emails will be logged to console only.");
  }

  return new ConsoleEmailProvider();
}

export const emailProvider: EmailProvider = buildEmailProvider();

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
}

export { createResendEmailProvider, getDefaultFromAddress } from "@/infrastructure/email/resend-email-provider";
