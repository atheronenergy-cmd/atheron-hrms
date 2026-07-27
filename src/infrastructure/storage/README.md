# Storage

Hybrid file storage for Atheron HRMS.

## Strategy

| Type | Examples | Where stored |
|---|---|---|
| **User uploads** | Employee documents, photos, company logo, attendance captures | **Cloudflare R2** (when configured) |
| **Exports / downloads** | Payroll reports, bank files, Excel exports, generated payslips & certificates | **Local disk only** (`./exports`) |

Exports are short-lived and safe to purge quarterly. Uploads stay in cloud storage.

## Environment variables

```env
# Local paths
STORAGE_LOCAL_PATH=./uploads      # fallback for uploads when R2 is not configured
STORAGE_EXPORT_PATH=./exports     # all generated exports/downloads

# Cloudflare R2 (uploads only)
STORAGE_R2_ACCOUNT_ID=
STORAGE_R2_ACCESS_KEY=
STORAGE_R2_SECRET_KEY=
STORAGE_R2_BUCKET=atheron-hrms
```

## Development (no R2)

Leave R2 variables empty. Everything falls back to local folders:

- `./uploads` — uploaded files
- `./exports` — generated reports and payslips

## Production

1. Create an R2 bucket in Cloudflare
2. Add DNS / API token with Object Read & Write
3. Set the four `STORAGE_R2_*` variables
4. Keep `STORAGE_EXPORT_PATH=./exports` on the app server (or mount a volume)
5. Schedule quarterly cleanup of `./exports` (or use a cron job)

## Category routing

Defined in `src/shared/constants/storage.ts`:

- **Cloud:** `document`, `employee_photo`, `company_logo`, `attendance_capture`
- **Local:** `report`, `payslip`, `certificate`

## R2 lifecycle (optional)

In Cloudflare R2 dashboard, you do **not** need lifecycle rules for uploads. Purge local exports separately on the server.
