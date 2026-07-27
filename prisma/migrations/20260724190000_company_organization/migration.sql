-- Company Setup & Organization Management

CREATE TYPE "hr_policy_category" AS ENUM ('attendance', 'leave', 'payroll', 'overtime', 'probation');

ALTER TABLE "companies" ADD COLUMN "legal_name" VARCHAR(255);
ALTER TABLE "companies" ADD COLUMN "company_code" VARCHAR(50);
ALTER TABLE "companies" ADD COLUMN "gst_number" VARCHAR(50);
ALTER TABLE "companies" ADD COLUMN "pan_number" VARCHAR(20);
ALTER TABLE "companies" ADD COLUMN "cin_number" VARCHAR(30);
ALTER TABLE "companies" ADD COLUMN "email" VARCHAR(255);
ALTER TABLE "companies" ADD COLUMN "phone" VARCHAR(20);
ALTER TABLE "companies" ADD COLUMN "website" VARCHAR(255);
ALTER TABLE "companies" ADD COLUMN "address" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "companies" ADD COLUMN "state" VARCHAR(100);
ALTER TABLE "companies" ADD COLUMN "city" VARCHAR(100);
ALTER TABLE "companies" ADD COLUMN "pin_code" VARCHAR(20);
ALTER TABLE "companies" ADD COLUMN "date_format" VARCHAR(30) NOT NULL DEFAULT 'dd MMM yyyy';
ALTER TABLE "companies" ADD COLUMN "payroll_cycle_day" SMALLINT;

CREATE UNIQUE INDEX "companies_company_code_key" ON "companies"("company_code") WHERE "company_code" IS NOT NULL;

ALTER TABLE "branches" ADD COLUMN "manager_user_id" UUID;
ALTER TABLE "branches" ADD COLUMN "phone" VARCHAR(20);
ALTER TABLE "branches" ADD COLUMN "email" VARCHAR(255);

ALTER TABLE "departments" ADD COLUMN "description" TEXT;

ALTER TABLE "designations" ADD COLUMN "department_id" UUID;
CREATE INDEX "idx_designations_department_id" ON "designations"("department_id");

ALTER TABLE "holidays" ADD COLUMN "description" TEXT;
ALTER TABLE "holidays" ADD COLUMN "applicable_department_ids" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "hr_policies" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "category" "hr_policy_category" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "status" "record_status" NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "hr_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_hr_policies_company_code" ON "hr_policies"("company_id", "code");
CREATE INDEX "idx_hr_policies_company_category" ON "hr_policies"("company_id", "category");

ALTER TABLE "branches" ADD CONSTRAINT "branches_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "designations" ADD CONSTRAINT "designations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hr_policies" ADD CONSTRAINT "hr_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
