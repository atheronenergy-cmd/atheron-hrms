-- QR Attendance Extension

CREATE TYPE "qr_code_type" AS ENUM ('office', 'branch', 'department', 'shift', 'meeting', 'training', 'visitor');
CREATE TYPE "qr_code_status" AS ENUM ('active', 'expired', 'revoked', 'used');
CREATE TYPE "qr_validation_mode" AS ENUM ('qr_only', 'qr_and_gps', 'qr_and_wifi');
CREATE TYPE "qr_scan_result" AS ENUM (
  'success',
  'expired',
  'invalid_signature',
  'replay_detected',
  'wrong_branch',
  'wrong_shift',
  'wrong_department',
  'fraud_suspected',
  'policy_violation',
  'revoked',
  'invalid_payload',
  'clock_tampering'
);

DROP INDEX IF EXISTS "qr_attendances_attendance_id_key";

CREATE TABLE "qr_codes" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code_type" "qr_code_type" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "branch_id" UUID,
    "department_id" UUID,
    "shift_id" UUID,
    "nonce_hash" VARCHAR(64) NOT NULL,
    "signature" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "expiry_seconds" SMALLINT NOT NULL,
    "status" "qr_code_status" NOT NULL DEFAULT 'active',
    "revoked_at" TIMESTAMPTZ,
    "revoked_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_policies" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "validation_mode" "qr_validation_mode" NOT NULL DEFAULT 'qr_only',
    "default_expiry_seconds" SMALLINT NOT NULL DEFAULT 60,
    "require_branch_match" BOOLEAN NOT NULL DEFAULT true,
    "require_shift_match" BOOLEAN NOT NULL DEFAULT false,
    "require_department_match" BOOLEAN NOT NULL DEFAULT false,
    "single_use" BOOLEAN NOT NULL DEFAULT true,
    "max_scans_per_employee" SMALLINT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "qr_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_scan_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "qr_code_id" UUID,
    "employee_id" UUID,
    "attendance_log_id" UUID,
    "punch_type" "punch_type",
    "scanned_at" TIMESTAMPTZ NOT NULL,
    "result" "qr_scan_result" NOT NULL,
    "failure_reason" TEXT,
    "nonce_hash" VARCHAR(64),
    "device_info" JSONB,
    "ip_address" VARCHAR(45),
    "risk_score" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_scan_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_validation_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "qr_code_id" UUID,
    "employee_id" UUID,
    "scan_log_id" UUID,
    "step" VARCHAR(30) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_validation_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "qr_attendances" ADD COLUMN IF NOT EXISTS "company_id" UUID;
ALTER TABLE "qr_attendances" ADD COLUMN IF NOT EXISTS "employee_id" UUID;
ALTER TABLE "qr_attendances" ADD COLUMN IF NOT EXISTS "qr_code_id" UUID;
ALTER TABLE "qr_attendances" ADD COLUMN IF NOT EXISTS "scan_log_id" UUID;
ALTER TABLE "qr_attendances" ADD COLUMN IF NOT EXISTS "qr_token_hash" VARCHAR(64);

UPDATE "qr_attendances"
SET "qr_token_hash" = COALESCE("qr_token_hash", encode(sha256("qr_code"::bytea), 'hex'))
WHERE "qr_token_hash" IS NULL;

ALTER TABLE "qr_attendances" DROP COLUMN IF EXISTS "qr_code";

CREATE INDEX "idx_qr_codes_company_status" ON "qr_codes"("company_id", "status");
CREATE INDEX "idx_qr_codes_company_expires" ON "qr_codes"("company_id", "expires_at");
CREATE INDEX "idx_qr_codes_nonce_hash" ON "qr_codes"("nonce_hash");
CREATE INDEX "idx_qr_codes_branch_id" ON "qr_codes"("branch_id");
CREATE INDEX "idx_qr_policies_company_default" ON "qr_policies"("company_id", "is_default");
CREATE INDEX "idx_qr_scan_logs_employee_scanned" ON "qr_scan_logs"("employee_id", "scanned_at");
CREATE INDEX "idx_qr_scan_logs_company_scanned" ON "qr_scan_logs"("company_id", "scanned_at");
CREATE INDEX "idx_qr_scan_logs_qr_code_id" ON "qr_scan_logs"("qr_code_id");
CREATE INDEX "idx_qr_scan_logs_result" ON "qr_scan_logs"("result");
CREATE INDEX "idx_qr_validation_logs_qr_code_created" ON "qr_validation_logs"("qr_code_id", "created_at");
CREATE INDEX "idx_qr_validation_logs_company_created" ON "qr_validation_logs"("company_id", "created_at");
CREATE INDEX "idx_qr_attendance_employee_scanned" ON "qr_attendances"("employee_id", "scanned_at");
CREATE INDEX "idx_qr_attendance_company_scanned" ON "qr_attendances"("company_id", "scanned_at");
CREATE INDEX "idx_qr_attendance_attendance_id" ON "qr_attendances"("attendance_id");
CREATE INDEX "idx_qr_attendance_qr_code_id" ON "qr_attendances"("qr_code_id");

ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_policies" ADD CONSTRAINT "qr_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_validation_logs" ADD CONSTRAINT "qr_validation_logs_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_attendances" ADD CONSTRAINT "qr_attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_attendances" ADD CONSTRAINT "qr_attendances_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
