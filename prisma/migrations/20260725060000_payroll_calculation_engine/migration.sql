-- Payroll Calculation Engine Migration

CREATE TYPE "payroll_period_type" AS ENUM ('monthly', 'weekly', 'biweekly', 'custom');
CREATE TYPE "payroll_period_status" AS ENUM ('draft', 'open', 'closed', 'locked');

ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'calculated';
ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'locked';

ALTER TABLE "payrolls" ALTER COLUMN "payroll_cycle_id" DROP NOT NULL;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "payroll_period_id" UUID;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "department_id" UUID;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "scope" VARCHAR(30) NOT NULL DEFAULT 'company';
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "error_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "calculation_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "approved_by" UUID;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMPTZ;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "locked_by" UUID;

CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "period_type" "payroll_period_type" NOT NULL DEFAULT 'monthly',
    "payroll_year" SMALLINT NOT NULL,
    "payroll_month" SMALLINT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "pay_date" DATE,
    "status" "payroll_period_status" NOT NULL DEFAULT 'draft',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_calculations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "payroll_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "employee_salary_id" UUID,
    "salary_structure_id" UUID,
    "status" "payroll_status" NOT NULL DEFAULT 'draft',
    "gross_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paid_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "working_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "attendance_summary" JSONB NOT NULL DEFAULT '{}',
    "leave_summary" JSONB NOT NULL DEFAULT '{}',
    "calculation_snapshot" JSONB NOT NULL DEFAULT '{}',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "calculation_version" INTEGER NOT NULL DEFAULT 1,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "payroll_calculations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_component_values" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "payroll_calculation_id" UUID NOT NULL,
    "component_code" VARCHAR(50) NOT NULL,
    "component_name" VARCHAR(100) NOT NULL,
    "component_type" "salary_component_type" NOT NULL,
    "calculation_type" "salary_calculation_type" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_employer_contribution" BOOLEAN NOT NULL DEFAULT false,
    "is_placeholder" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_component_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_summaries" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "payroll_id" UUID,
    "payroll_period_id" UUID,
    "total_gross" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "payroll_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_calculation_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "payroll_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "actor_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_calculation_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_versions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "payroll_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "payroll_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_payroll_periods_company_range" ON "payroll_periods"("company_id", "period_type", "payroll_year", "payroll_month", "start_date");
CREATE UNIQUE INDEX "uq_payroll_calculations_payroll_employee" ON "payroll_calculations"("payroll_id", "employee_id");
CREATE UNIQUE INDEX "uq_payroll_versions_payroll_number" ON "payroll_versions"("payroll_id", "version_number");

ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_calculations" ADD CONSTRAINT "payroll_calculations_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_calculations" ADD CONSTRAINT "payroll_calculations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_component_values" ADD CONSTRAINT "payroll_component_values_calculation_id_fkey" FOREIGN KEY ("payroll_calculation_id") REFERENCES "payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_summaries" ADD CONSTRAINT "payroll_summaries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_summaries" ADD CONSTRAINT "payroll_summaries_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_summaries" ADD CONSTRAINT "payroll_summaries_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_calculation_logs" ADD CONSTRAINT "payroll_calculation_logs_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_versions" ADD CONSTRAINT "payroll_versions_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
