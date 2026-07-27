-- Employee Management Module

ALTER TYPE "employee_status" ADD VALUE IF NOT EXISTS 'inactive';
ALTER TYPE "employee_status" ADD VALUE IF NOT EXISTS 'on_leave';
ALTER TYPE "employee_status" ADD VALUE IF NOT EXISTS 'resigned';
ALTER TYPE "employee_status" ADD VALUE IF NOT EXISTS 'terminated';
ALTER TYPE "employee_status" ADD VALUE IF NOT EXISTS 'retired';

ALTER TYPE "employment_type" ADD VALUE IF NOT EXISTS 'consultant';
ALTER TYPE "employment_type" ADD VALUE IF NOT EXISTS 'trainee';

ALTER TABLE "employees" ADD COLUMN "preferred_name" VARCHAR(100);
ALTER TABLE "employees" ADD COLUMN "personal_email" VARCHAR(255);
ALTER TABLE "employees" ADD COLUMN "alternate_phone" VARCHAR(20);
ALTER TABLE "employees" ADD COLUMN "blood_group" VARCHAR(10);
ALTER TABLE "employees" ADD COLUMN "nationality" VARCHAR(100);
ALTER TABLE "employees" ADD COLUMN "marital_status" VARCHAR(30);
ALTER TABLE "employees" ADD COLUMN "father_name" VARCHAR(200);
ALTER TABLE "employees" ADD COLUMN "mother_name" VARCHAR(200);
ALTER TABLE "employees" ADD COLUMN "spouse_name" VARCHAR(200);
ALTER TABLE "employees" ADD COLUMN "confirmation_date" DATE;
ALTER TABLE "employees" ADD COLUMN "probation_status" VARCHAR(50);
ALTER TABLE "employees" ADD COLUMN "notice_period_days" SMALLINT;
ALTER TABLE "employees" ADD COLUMN "work_location" VARCHAR(255);
ALTER TABLE "employees" ADD COLUMN "emergency_contact" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "employees" ADD COLUMN "permanent_address" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "employees" ADD COLUMN "current_address" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "employees" ADD COLUMN "identity_documents" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "idx_employees_designation_id" ON "employees"("designation_id");
CREATE INDEX "idx_employees_company_record_status" ON "employees"("company_id", "status");
CREATE INDEX "idx_employees_company_name" ON "employees"("company_id", "first_name", "last_name");

CREATE TABLE "employee_code_sequences" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "prefix" VARCHAR(20) NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "employee_code_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_employee_code_seq_company_branch" ON "employee_code_sequences"("company_id", "branch_id");
CREATE INDEX "idx_employee_code_seq_company" ON "employee_code_sequences"("company_id");

CREATE TABLE "employee_timeline_events" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "employee_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_employee_timeline_employee_date" ON "employee_timeline_events"("employee_id", "occurred_at");
CREATE INDEX "idx_employee_timeline_company_type" ON "employee_timeline_events"("company_id", "event_type");

ALTER TABLE "employee_code_sequences" ADD CONSTRAINT "employee_code_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_code_sequences" ADD CONSTRAINT "employee_code_sequences_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_timeline_events" ADD CONSTRAINT "employee_timeline_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_timeline_events" ADD CONSTRAINT "employee_timeline_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
