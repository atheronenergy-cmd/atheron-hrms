-- Employee Lifecycle Module
-- CreateEnum
CREATE TYPE "workflow_status" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled');
CREATE TYPE "workflow_action_type" AS ENUM ('submit', 'review', 'approve', 'reject', 'cancel');
CREATE TYPE "approver_role" AS ENUM ('manager', 'hr', 'director');
CREATE TYPE "probation_record_status" AS ENUM ('running', 'completed', 'extended', 'failed');
CREATE TYPE "transfer_type" AS ENUM ('branch', 'department', 'location', 'manager');
CREATE TYPE "warning_type" AS ENUM ('performance', 'attendance', 'behavior', 'policy_violation');
CREATE TYPE "resignation_reason" AS ENUM ('career_growth', 'personal', 'relocation', 'higher_studies', 'health', 'other');
CREATE TYPE "resignation_status" AS ENUM ('submitted', 'manager_approved', 'hr_processing', 'exit_clearance', 'final_release', 'rejected', 'cancelled');
CREATE TYPE "clearance_department" AS ENUM ('hr', 'accounts', 'it', 'admin', 'store');
CREATE TYPE "clearance_item_status" AS ENUM ('pending', 'completed', 'waived');
CREATE TYPE "journey_stage" AS ENUM ('pre_joining', 'joining', 'probation', 'confirmation', 'active', 'transfer', 'promotion', 'increment', 'warning', 'suspension', 'resignation', 'termination', 'exit_clearance', 'final_settlement', 'alumni');
CREATE TYPE "joining_status" AS ENUM ('pending', 'in_progress', 'hr_approved', 'manager_approved', 'completed');
CREATE TYPE "lifecycle_record_status" AS ENUM ('active', 'inactive', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "workflow_requests" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" "workflow_status" NOT NULL DEFAULT 'draft',
    "current_step" SMALLINT NOT NULL DEFAULT 0,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "workflow_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_approval_steps" (
    "id" UUID NOT NULL,
    "workflow_request_id" UUID NOT NULL,
    "step_order" SMALLINT NOT NULL,
    "approver_role" "approver_role" NOT NULL,
    "approver_user_id" UUID,
    "status" "workflow_status" NOT NULL DEFAULT 'submitted',
    "action_type" "workflow_action_type",
    "comments" TEXT,
    "acted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_approval_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_journey_events" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "stage" "journey_stage" NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "event_date" TIMESTAMPTZ NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "employee_journey_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_joining_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "joining_date" DATE NOT NULL,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "status" "joining_status" NOT NULL DEFAULT 'pending',
    "hr_approved" BOOLEAN NOT NULL DEFAULT false,
    "manager_approved" BOOLEAN NOT NULL DEFAULT false,
    "hr_approved_by" UUID,
    "manager_approved_by" UUID,
    "hr_approved_at" TIMESTAMPTZ,
    "manager_approved_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_joining_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "probation_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "duration_days" SMALLINT NOT NULL,
    "status" "probation_record_status" NOT NULL DEFAULT 'running',
    "reviewer_id" UUID,
    "review_notes" TEXT,
    "extended_to" DATE,
    "recommendation" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "probation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "confirmation_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "confirmation_date" DATE NOT NULL,
    "approved_by" UUID,
    "manager_approved_by" UUID,
    "rating" DECIMAL(3,1),
    "comments" TEXT,
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "confirmation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transfer_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "transfer_type" "transfer_type" NOT NULL,
    "previous_value" VARCHAR(255) NOT NULL,
    "new_value" VARCHAR(255) NOT NULL,
    "previous_id" UUID,
    "new_id" UUID,
    "effective_date" DATE NOT NULL,
    "reason" TEXT,
    "approved_by" UUID,
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "transfer_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotion_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "previous_designation" VARCHAR(200) NOT NULL,
    "new_designation" VARCHAR(200) NOT NULL,
    "previous_designation_id" UUID,
    "new_designation_id" UUID,
    "promotion_date" DATE NOT NULL,
    "reason" TEXT,
    "approved_by" UUID,
    "comments" TEXT,
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "promotion_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "salary_revision_history" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "previous_salary" DECIMAL(15,2) NOT NULL,
    "new_salary" DECIMAL(15,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "reason" TEXT,
    "revision_type" VARCHAR(50),
    "approved_by" UUID,
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "salary_revision_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warning_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "warning_type" "warning_type" NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "issued_date" DATE NOT NULL,
    "issued_by" UUID,
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "warning_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suspension_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "reason" TEXT NOT NULL,
    "approved_by" UUID,
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "suspension_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resignation_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "resignation_date" DATE NOT NULL,
    "last_working_date" DATE NOT NULL,
    "reason" "resignation_reason" NOT NULL,
    "reason_details" TEXT,
    "notice_period_days" SMALLINT,
    "approval_status" "resignation_status" NOT NULL DEFAULT 'submitted',
    "manager_approved_by" UUID,
    "hr_processed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "resignation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exit_clearances" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "resignation_record_id" UUID,
    "termination_record_id" UUID,
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "completed_at" TIMESTAMPTZ,
    "completed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "exit_clearances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exit_clearance_items" (
    "id" UUID NOT NULL,
    "exit_clearance_id" UUID NOT NULL,
    "department" "clearance_department" NOT NULL,
    "checklist_item" VARCHAR(255) NOT NULL,
    "status" "clearance_item_status" NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMPTZ,
    "completed_by" UUID,
    "remarks" TEXT,
    CONSTRAINT "exit_clearance_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "termination_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "termination_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "approved_by" UUID,
    "comments" TEXT,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "status" "lifecycle_record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "termination_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alumni_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "joining_date" DATE NOT NULL,
    "exit_date" DATE NOT NULL,
    "last_designation" VARCHAR(200) NOT NULL,
    "last_department" VARCHAR(200) NOT NULL,
    "employment_history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    CONSTRAINT "alumni_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lifecycle_notifications" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "due_date" TIMESTAMPTZ,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lifecycle_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_joining_records_employee_id_key" ON "employee_joining_records"("employee_id");
CREATE UNIQUE INDEX "alumni_records_employee_id_key" ON "alumni_records"("employee_id");
CREATE INDEX "idx_workflow_requests_employee_status" ON "workflow_requests"("employee_id", "status");
CREATE INDEX "idx_workflow_requests_company_entity" ON "workflow_requests"("company_id", "entity_type");
CREATE INDEX "idx_workflow_steps_request_order" ON "workflow_approval_steps"("workflow_request_id", "step_order");
CREATE INDEX "idx_employee_journey_events_employee_date" ON "employee_journey_events"("employee_id", "event_date");
CREATE INDEX "idx_employee_journey_events_company_stage" ON "employee_journey_events"("company_id", "stage");
CREATE INDEX "idx_employee_joining_records_status" ON "employee_joining_records"("company_id", "status");
CREATE INDEX "idx_probation_records_employee_status" ON "probation_records"("employee_id", "status");
CREATE INDEX "idx_probation_records_end_date" ON "probation_records"("company_id", "end_date");
CREATE INDEX "idx_confirmation_records_employee" ON "confirmation_records"("employee_id");
CREATE INDEX "idx_confirmation_records_date" ON "confirmation_records"("company_id", "confirmation_date");
CREATE INDEX "idx_transfer_records_employee_date" ON "transfer_records"("employee_id", "effective_date");
CREATE INDEX "idx_transfer_records_company_type" ON "transfer_records"("company_id", "transfer_type");
CREATE INDEX "idx_promotion_records_employee_date" ON "promotion_records"("employee_id", "promotion_date");
CREATE INDEX "idx_salary_revision_history_employee_date" ON "salary_revision_history"("employee_id", "effective_date");
CREATE INDEX "idx_warning_records_employee_date" ON "warning_records"("employee_id", "issued_date");
CREATE INDEX "idx_suspension_records_employee_date" ON "suspension_records"("employee_id", "start_date");
CREATE INDEX "idx_resignation_records_employee_status" ON "resignation_records"("employee_id", "approval_status");
CREATE INDEX "idx_exit_clearances_employee" ON "exit_clearances"("employee_id");
CREATE INDEX "idx_exit_clearance_items_clearance_dept" ON "exit_clearance_items"("exit_clearance_id", "department");
CREATE INDEX "idx_termination_records_employee_date" ON "termination_records"("employee_id", "termination_date");
CREATE INDEX "idx_alumni_records_exit_date" ON "alumni_records"("company_id", "exit_date");
CREATE INDEX "idx_lifecycle_notifications_company_read" ON "lifecycle_notifications"("company_id", "is_read");
CREATE INDEX "idx_lifecycle_notifications_employee_type" ON "lifecycle_notifications"("employee_id", "type");

-- AddForeignKey
ALTER TABLE "workflow_requests" ADD CONSTRAINT "workflow_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_approval_steps" ADD CONSTRAINT "workflow_approval_steps_workflow_request_id_fkey" FOREIGN KEY ("workflow_request_id") REFERENCES "workflow_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_journey_events" ADD CONSTRAINT "employee_journey_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_joining_records" ADD CONSTRAINT "employee_joining_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "probation_records" ADD CONSTRAINT "probation_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "confirmation_records" ADD CONSTRAINT "confirmation_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_records" ADD CONSTRAINT "promotion_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_revision_history" ADD CONSTRAINT "salary_revision_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warning_records" ADD CONSTRAINT "warning_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suspension_records" ADD CONSTRAINT "suspension_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resignation_records" ADD CONSTRAINT "resignation_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exit_clearances" ADD CONSTRAINT "exit_clearances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exit_clearances" ADD CONSTRAINT "exit_clearances_resignation_record_id_fkey" FOREIGN KEY ("resignation_record_id") REFERENCES "resignation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exit_clearance_items" ADD CONSTRAINT "exit_clearance_items_exit_clearance_id_fkey" FOREIGN KEY ("exit_clearance_id") REFERENCES "exit_clearances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "termination_records" ADD CONSTRAINT "termination_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alumni_records" ADD CONSTRAINT "alumni_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lifecycle_notifications" ADD CONSTRAINT "lifecycle_notifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
