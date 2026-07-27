/**
 * Send a test email via Resend.
 * Run: npx tsx scripts/test-resend-email.ts you@yourdomain.com
 */
import { createResendEmailProvider, isEmailConfigured } from "../src/infrastructure/email/email-provider";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npx tsx scripts/test-resend-email.ts recipient@example.com");
    process.exit(1);
  }

  if (!isEmailConfigured()) {
    console.error("RESEND_API_KEY and RESEND_FROM must be set in .env");
    process.exit(1);
  }

  const provider = createResendEmailProvider();
  await provider.send(
    to,
    "Atheron HRMS — Resend test email",
    `Hello,

This is a test email from Atheron HRMS via Resend.

If you received this, your Resend configuration is working.

— Atheron HRMS`,
    { tags: ["test"] },
  );

  console.log(`Test email sent to ${to}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
