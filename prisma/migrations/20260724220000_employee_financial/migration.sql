-- Employee Financial, Family & Statutory Information

CREATE TYPE "bank_account_type" AS ENUM ('savings', 'current');
CREATE TYPE "bank_verification_status" AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE "insurance_policy_status" AS ENUM ('active', 'inactive', 'expired', 'cancelled');

CREATE TABLE "employee_bank_details" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "account_holder_name" VARCHAR(200) NOT NULL,
    "bank_name" VARCHAR(200) NOT NULL,
    "branch_name" VARCHAR(200),
    "account_number_enc" TEXT NOT NULL,
    "ifsc_code" VARCHAR(20) NOT NULL,
    "account_type" "bank_account_type" NOT NULL DEFAULT 'savings',
    "upi_id_enc" TEXT,
    "cheque_file_id" UUID,
    "verification_status" "bank_verification_status" NOT NULL DEFAULT 'pending',
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_bank_details_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_emergency_contacts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "relation" VARCHAR(100) NOT NULL,
    "mobile_enc" TEXT NOT NULL,
    "email" VARCHAR(255),
    "address" JSONB NOT NULL DEFAULT '{}',
    "priority" SMALLINT NOT NULL DEFAULT 1,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_emergency_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_family_members" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "relation" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "gender" "gender",
    "occupation" VARCHAR(200),
    "is_dependent" BOOLEAN NOT NULL DEFAULT false,
    "dependent_since" DATE,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_family_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_nominees" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "relation" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "address" JSONB NOT NULL DEFAULT '{}',
    "mobile_enc" TEXT,
    "percentage" DECIMAL(5,2) NOT NULL,
    "nominee_type" VARCHAR(100) NOT NULL,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_nominees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_statutory_details" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "pf_number_enc" TEXT,
    "uan_number_enc" TEXT,
    "esi_number_enc" TEXT,
    "esi_eligible" BOOLEAN NOT NULL DEFAULT false,
    "pf_joining_date" DATE,
    "pf_contribution_type" VARCHAR(50),
    "professional_tax_applicable" BOOLEAN NOT NULL DEFAULT false,
    "lwf_applicable" BOOLEAN NOT NULL DEFAULT false,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_statutory_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_statutory_details_employee_id_key" ON "employee_statutory_details"("employee_id");

CREATE TABLE "employee_tax_profiles" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "pan_number_enc" TEXT,
    "tax_regime" VARCHAR(30),
    "financial_year" VARCHAR(10),
    "tax_declaration" JSONB NOT NULL DEFAULT '{}',
    "investment_declaration" JSONB NOT NULL DEFAULT '{}',
    "previous_employer" JSONB NOT NULL DEFAULT '{}',
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_tax_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_tax_profiles_employee_id_key" ON "employee_tax_profiles"("employee_id");

CREATE TABLE "employee_insurance" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "provider" VARCHAR(200) NOT NULL,
    "policy_number_enc" TEXT NOT NULL,
    "coverage_amount" DECIMAL(14,2),
    "start_date" DATE,
    "end_date" DATE,
    "nominee_name" VARCHAR(200),
    "policy_status" "insurance_policy_status" NOT NULL DEFAULT 'active',
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_insurance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_financial_access_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "user_id" UUID,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "field_name" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_financial_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_employee_bank_details_employee" ON "employee_bank_details"("employee_id");
CREATE INDEX "idx_employee_bank_details_company_employee" ON "employee_bank_details"("company_id", "employee_id");
CREATE INDEX "idx_employee_bank_details_verification" ON "employee_bank_details"("verification_status");
CREATE INDEX "idx_employee_emergency_contacts_employee" ON "employee_emergency_contacts"("employee_id");
CREATE INDEX "idx_employee_emergency_contacts_company" ON "employee_emergency_contacts"("company_id", "employee_id");
CREATE INDEX "idx_employee_family_members_employee" ON "employee_family_members"("employee_id");
CREATE INDEX "idx_employee_family_members_company" ON "employee_family_members"("company_id", "employee_id");
CREATE INDEX "idx_employee_nominees_employee" ON "employee_nominees"("employee_id");
CREATE INDEX "idx_employee_nominees_company" ON "employee_nominees"("company_id", "employee_id");
CREATE INDEX "idx_employee_statutory_details_company" ON "employee_statutory_details"("company_id");
CREATE INDEX "idx_employee_tax_profiles_company" ON "employee_tax_profiles"("company_id");
CREATE INDEX "idx_employee_insurance_employee" ON "employee_insurance"("employee_id");
CREATE INDEX "idx_employee_insurance_company" ON "employee_insurance"("company_id", "employee_id");
CREATE INDEX "idx_employee_insurance_status" ON "employee_insurance"("policy_status");
CREATE INDEX "idx_employee_financial_access_employee" ON "employee_financial_access_logs"("employee_id", "created_at");
CREATE INDEX "idx_employee_financial_access_company" ON "employee_financial_access_logs"("company_id", "entity_type");

ALTER TABLE "employee_bank_details" ADD CONSTRAINT "employee_bank_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_emergency_contacts" ADD CONSTRAINT "employee_emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_family_members" ADD CONSTRAINT "employee_family_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_nominees" ADD CONSTRAINT "employee_nominees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_statutory_details" ADD CONSTRAINT "employee_statutory_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_tax_profiles" ADD CONSTRAINT "employee_tax_profiles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_insurance" ADD CONSTRAINT "employee_insurance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
