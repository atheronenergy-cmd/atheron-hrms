-- Attendance Core Engine Extension

-- Extend attendance_status enum
ALTER TYPE "attendance_status" ADD VALUE IF NOT EXISTS 'early_leaving';
ALTER TYPE "attendance_status" ADD VALUE IF NOT EXISTS 'weekly_off';
ALTER TYPE "attendance_status" ADD VALUE IF NOT EXISTS 'work_from_home';
ALTER TYPE "attendance_status" ADD VALUE IF NOT EXISTS 'outdoor_duty';
ALTER TYPE "attendance_status" ADD VALUE IF NOT EXISTS 'overtime';

-- CreateEnum
CREATE TYPE "attendance_approval_status" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "attendance_correction_type" AS ENUM ('missed_punch', 'wrong_timing', 'wrong_location', 'manual');
CREATE TYPE "attendance_correction_status" AS ENUM ('submitted', 'manager_approved', 'hr_approved', 'rejected', 'cancelled');
CREATE TYPE "attendance_summary_period" AS ENUM ('daily', 'monthly');

-- AlterTable attendances
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "effective_work_minutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "break_minutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "late_minutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "early_leaving_minutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "department_id" UUID;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "approval_status" "attendance_approval_status" NOT NULL DEFAULT 'pending';

-- CreateTable attendance_rules
CREATE TABLE "attendance_rules" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "grace_period_minutes" SMALLINT NOT NULL DEFAULT 15,
    "late_limit_minutes" SMALLINT NOT NULL DEFAULT 15,
    "half_day_threshold_minutes" SMALLINT NOT NULL DEFAULT 240,
    "overtime_start_minutes" SMALLINT NOT NULL DEFAULT 0,
    "minimum_work_minutes" SMALLINT NOT NULL DEFAULT 480,
    "early_leaving_grace_minutes" SMALLINT NOT NULL DEFAULT 15,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "attendance_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_id" UUID,
    "attendance_date" DATE NOT NULL,
    "correction_type" "attendance_correction_type" NOT NULL,
    "requested_check_in" TIMESTAMPTZ,
    "requested_check_out" TIMESTAMPTZ,
    "reason" TEXT NOT NULL,
    "status" "attendance_correction_status" NOT NULL DEFAULT 'submitted',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_approvals" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "correction_id" UUID NOT NULL,
    "approver_role" VARCHAR(30) NOT NULL,
    "approver_user_id" UUID,
    "status" "attendance_approval_status" NOT NULL DEFAULT 'pending',
    "comments" TEXT,
    "acted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_summaries" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_id" UUID,
    "period_type" "attendance_summary_period" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "present_days" SMALLINT NOT NULL DEFAULT 0,
    "absent_days" SMALLINT NOT NULL DEFAULT 0,
    "late_days" SMALLINT NOT NULL DEFAULT 0,
    "half_days" SMALLINT NOT NULL DEFAULT 0,
    "leave_days" SMALLINT NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_work_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "attendance_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_attendance_branch_date" ON "attendances"("branch_id", "date");
CREATE INDEX "idx_attendance_department_date" ON "attendances"("department_id", "date");
CREATE INDEX "idx_attendance_company_approval" ON "attendances"("company_id", "approval_status");
CREATE INDEX "idx_attendance_rules_company_default" ON "attendance_rules"("company_id", "is_default");
CREATE INDEX "idx_attendance_corrections_employee_date" ON "attendance_corrections"("employee_id", "attendance_date");
CREATE INDEX "idx_attendance_corrections_company_status" ON "attendance_corrections"("company_id", "status");
CREATE INDEX "idx_attendance_approvals_correction" ON "attendance_approvals"("correction_id", "approver_role");
CREATE UNIQUE INDEX "uq_attendance_summary_employee_period" ON "attendance_summaries"("employee_id", "period_type", "period_start");
CREATE INDEX "idx_attendance_summary_company_period" ON "attendance_summaries"("company_id", "period_type", "period_start");

-- AddForeignKey
ALTER TABLE "attendance_rules" ADD CONSTRAINT "attendance_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_approvals" ADD CONSTRAINT "attendance_approvals_correction_id_fkey" FOREIGN KEY ("correction_id") REFERENCES "attendance_corrections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
