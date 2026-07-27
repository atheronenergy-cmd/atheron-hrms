import { Resend } from "resend";

import { appConfig } from "@/shared/config/env";

import type { EmailAttachment, EmailProvider, EmailSendOptions } from "./email-provider";

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">${escaped.replace(/\n/g, "<br />")}</div>`;
}

export class ResendEmailProvider implements EmailProvider {
  private client: Resend;
  private from: string;

  constructor(apiKey = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM) {
    if (!apiKey) throw new Error("RESEND_API_KEY is required for ResendEmailProvider");
    if (!from) throw new Error("RESEND_FROM is required for ResendEmailProvider");
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(to: string, subject: string, body: string, options?: EmailSendOptions): Promise<void> {
    const html = options?.html ?? textToHtml(body);
    const { error } = await this.client.emails.send({
      from: this.from,
      to: [to],
      subject,
      text: body,
      html,
      replyTo: options?.replyTo,
      attachments: options?.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
      tags: options?.tags?.map((name) => ({ name, value: "true" })),
    });

    if (error) {
      throw new Error(error.message ?? "Resend email send failed");
    }
  }
}

export function createResendEmailProvider(): EmailProvider {
  return new ResendEmailProvider();
}

export function getDefaultFromAddress(): string {
  return process.env.RESEND_FROM ?? `${appConfig.name} <onboarding@resend.dev>`;
}
