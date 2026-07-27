-- Enterprise Leave Management Extension

ALTER TYPE "leave_status" ADD VALUE IF NOT EXISTS 'sent_back';

CREATE TYPE "leave_half_day_type" AS ENUM ('none', 'first_half', 'second_half');
CREATE TYPE "leave_unit" AS ENUM ('days', 'hours');
CREATE TYPE "leave_approval_role" AS ENUM ('manager', 'department_head', 'hr');
CREATE TYPE "leave_accrual_period" AS ENUM ('monthly', 'yearly');
CREATE TYPE "leave_encashment_status" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'paid');

ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "max_per_month" DECIMAL(5,2);
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "max_per_year" DECIMAL(5,2);
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "min_days_per_request" DECIMAL(5,2) NOT NULL DEFAULT 0.5;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "max_days_per_request" DECIMAL(5,2);
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "half_day_allowed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "hourly_leave_allowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "medical_certificate_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "manager_approval_required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "hr_approval_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "gender_restriction" "gender";
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "probation_restricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "notice_period_restricted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "leave_policies" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "leave_type_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "accrual_period" "leave_accrual_period" NOT NULL DEFAULT 'yearly',
    "credit_amount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "allow_carry_forward" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "expiry_months" SMALLINT,
    "allow_negative_balance" BOOLEAN NOT NULL DEFAULT false,
    "sandwich_holiday_rule" BOOLEAN NOT NULL DEFAULT false,
    "exclude_weekly_off" BOOLEAN NOT NULL DEFAULT true,
    "probation_rule" JSONB NOT NULL DEFAULT '{}',
    "notice_period_rule" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "department_id" UUID;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "start_time" TIME;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "end_time" TIME;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "total_hours" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "leave_unit" "leave_unit" NOT NULL DEFAULT 'days';
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "half_day_type" "leave_half_day_type" NOT NULL DEFAULT 'none';
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "current_approval_level" SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "emergency_contact" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "delegate_employee_id" UUID;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ;

ALTER TABLE "leave_approvals" ADD COLUMN IF NOT EXISTS "company_id" UUID;
ALTER TABLE "leave_approvals" ADD COLUMN IF NOT EXISTS "approver_role" "leave_approval_role";

UPDATE "leave_approvals" SET "approver_role" = 'manager'::"leave_approval_role" WHERE "approver_role" IS NULL;
ALTER TABLE "leave_approvals" ALTER COLUMN "approver_role" SET NOT NULL;

ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS "company_id" UUID;
ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS "opening_balance" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS "credited" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS "rejected" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS "expired" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "leave_balances" ADD COLUMN IF NOT EXISTS "closing_balance" DECIMAL(5,2) NOT NULL DEFAULT 0;

CREATE TABLE "leave_attachments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "leave_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "file_name" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "leave_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_histories" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "leave_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "from_status" "leave_status",
    "to_status" "leave_status",
    "actor_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_encashments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "year" SMALLINT NOT NULL,
    "days" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "leave_encashment_status" NOT NULL DEFAULT 'draft',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "leave_encashments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_accruals" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "period_type" "leave_accrual_period" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "credited_days" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "leave_accruals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_leave_policies_company_default" ON "leave_policies"("company_id", "is_default");
CREATE INDEX "idx_leaves_branch_start" ON "leaves"("branch_id", "start_date");
CREATE INDEX "idx_leaves_department_start" ON "leaves"("department_id", "start_date");
CREATE INDEX "idx_leave_approvals_leave_level" ON "leave_approvals"("leave_id", "level");
CREATE INDEX "idx_leave_approvals_company_status" ON "leave_approvals"("company_id", "status");
CREATE INDEX "idx_leave_attachments_leave_id" ON "leave_attachments"("leave_id");
CREATE INDEX "idx_leave_history_leave_created" ON "leave_histories"("leave_id", "created_at");
CREATE INDEX "idx_leave_history_employee_created" ON "leave_histories"("employee_id", "created_at");
CREATE INDEX "idx_leave_encashments_employee_year" ON "leave_encashments"("employee_id", "year");
CREATE INDEX "idx_leave_accruals_employee_period" ON "leave_accruals"("employee_id", "period_start");
CREATE INDEX "idx_leave_balances_company_year" ON "leave_balances"("company_id", "year");

ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_delegate_employee_id_fkey" FOREIGN KEY ("delegate_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_attachments" ADD CONSTRAINT "leave_attachments_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "leaves"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_histories" ADD CONSTRAINT "leave_histories_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "leaves"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_encashments" ADD CONSTRAINT "leave_encashments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_encashments" ADD CONSTRAINT "leave_encashments_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_accruals" ADD CONSTRAINT "leave_accruals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_accruals" ADD CONSTRAINT "leave_accruals_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
