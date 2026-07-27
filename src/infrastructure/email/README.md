# Email (Resend)

Transactional email is sent through [Resend](https://resend.com).

## Environment variables

```env
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM="Atheron HRMS <noreply@yourdomain.com>"
```

## Setup checklist

1. Create a Resend account and generate an API key.
2. Add and verify your domain in Resend (Cloudflare DNS records: SPF, DKIM, optional DMARC).
3. Set `RESEND_FROM` to a verified sender on that domain.
4. Add both variables to `.env` and restart the app.

## Test

```bash
npx tsx scripts/test-resend-email.ts you@yourdomain.com
```

## Behavior

- When `RESEND_API_KEY` and `RESEND_FROM` are set, all app emails use Resend.
- When not set, emails are logged to the console (development fallback).
- Payslip distribution sends the PDF as an attachment when available.

## Used by

- Password reset
- Email verification
- User invitations
- Payslip distribution
