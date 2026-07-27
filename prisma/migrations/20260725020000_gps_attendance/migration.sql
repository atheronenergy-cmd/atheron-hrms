-- GPS Attendance & Geo-Fencing Extension

CREATE TYPE "gps_activity_type" AS ENUM (
  'office_check_in',
  'office_check_out',
  'field_visit',
  'outdoor_duty',
  'client_visit',
  'remote_work',
  'duty_start',
  'duty_end',
  'location_punch'
);

CREATE TYPE "location_validation_status" AS ENUM (
  'valid',
  'outside_radius',
  'gps_disabled',
  'permission_denied',
  'low_accuracy',
  'fraud_suspected',
  'override_applied'
);

ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "gps_attendance_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "allow_outside_location" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "location_required" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "geo_fences" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "radius_meters" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "geo_fences_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "gps_attendances_attendance_id_key";

ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "company_id" UUID;
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "employee_id" UUID;
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "geo_fence_id" UUID;
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "activity_type" "gps_activity_type";
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "captured_at" TIMESTAMPTZ;
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "validation_status" "location_validation_status";
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "distance_from_office_meters" INTEGER;
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "device_info" JSONB;
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(45);
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "network_type" VARCHAR(30);
ALTER TABLE "gps_attendances" ADD COLUMN IF NOT EXISTS "risk_score" SMALLINT NOT NULL DEFAULT 0;

UPDATE "gps_attendances"
SET
  "captured_at" = COALESCE("captured_at", "created_at"),
  "activity_type" = COALESCE("activity_type", 'office_check_in'::"gps_activity_type"),
  "validation_status" = COALESCE("validation_status", CASE WHEN "is_within_geofence" THEN 'valid'::"location_validation_status" ELSE 'outside_radius'::"location_validation_status" END)
WHERE "captured_at" IS NULL OR "activity_type" IS NULL OR "validation_status" IS NULL;

ALTER TABLE "gps_attendances" ALTER COLUMN "captured_at" SET NOT NULL;
ALTER TABLE "gps_attendances" ALTER COLUMN "activity_type" SET NOT NULL;
ALTER TABLE "gps_attendances" ALTER COLUMN "validation_status" SET NOT NULL;

CREATE TABLE "employee_location_histories" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "accuracy" DECIMAL(8,2),
    "altitude" DECIMAL(8,2),
    "address" TEXT,
    "activity_type" "gps_activity_type" NOT NULL,
    "captured_at" TIMESTAMPTZ NOT NULL,
    "device_info" JSONB,
    "ip_address" VARCHAR(45),
    "network_type" VARCHAR(30),
    "risk_score" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_location_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "location_validation_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID,
    "geo_fence_id" UUID,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "accuracy" DECIMAL(8,2),
    "distance_meters" INTEGER,
    "allowed_radius_meters" INTEGER,
    "validation_status" "location_validation_status" NOT NULL,
    "rejection_reason" TEXT,
    "risk_score" SMALLINT NOT NULL DEFAULT 0,
    "device_info" JSONB,
    "ip_address" VARCHAR(45),
    "network_type" VARCHAR(30),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "location_validation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_geo_fences_branch_id" ON "geo_fences"("branch_id");
CREATE INDEX "idx_geo_fences_company_id" ON "geo_fences"("company_id");
CREATE INDEX "idx_gps_attendance_employee_captured" ON "gps_attendances"("employee_id", "captured_at");
CREATE INDEX "idx_gps_attendance_company_captured" ON "gps_attendances"("company_id", "captured_at");
CREATE INDEX "idx_gps_attendance_attendance_id" ON "gps_attendances"("attendance_id");
CREATE INDEX "idx_gps_attendance_branch_id" ON "gps_attendances"("branch_id");
CREATE INDEX "idx_employee_location_history_employee_captured" ON "employee_location_histories"("employee_id", "captured_at");
CREATE INDEX "idx_employee_location_history_company_captured" ON "employee_location_histories"("company_id", "captured_at");
CREATE INDEX "idx_employee_location_history_branch_captured" ON "employee_location_histories"("branch_id", "captured_at");
CREATE INDEX "idx_location_validation_log_employee_created" ON "location_validation_logs"("employee_id", "created_at");
CREATE INDEX "idx_location_validation_log_company_created" ON "location_validation_logs"("company_id", "created_at");
CREATE INDEX "idx_location_validation_log_branch_id" ON "location_validation_logs"("branch_id");

ALTER TABLE "geo_fences" ADD CONSTRAINT "geo_fences_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gps_attendances" ADD CONSTRAINT "gps_attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gps_attendances" ADD CONSTRAINT "gps_attendances_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gps_attendances" ADD CONSTRAINT "gps_attendances_geo_fence_id_fkey" FOREIGN KEY ("geo_fence_id") REFERENCES "geo_fences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_location_histories" ADD CONSTRAINT "employee_location_histories_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "location_validation_logs" ADD CONSTRAINT "location_validation_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
