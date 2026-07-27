-- Indian Statutory Payroll Engine

CREATE TYPE "statutory_rule_type" AS ENUM ('pf', 'esi', 'professional_tax', 'income_tax', 'employer_contribution');
CREATE TYPE "statutory_version_status" AS ENUM ('draft', 'active', 'archived');
CREATE TYPE "investment_declaration_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

CREATE TABLE "financial_years" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "financial_years_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "statutory_rules" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "rule_type" "statutory_rule_type" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "statutory_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "statutory_versions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "statutory_rule_id" UUID NOT NULL,
    "financial_year_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" "statutory_version_status" NOT NULL DEFAULT 'draft',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "statutory_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pf_configurations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "statutory_version_id" UUID NOT NULL,
    "employee_contribution_rate" DECIMAL(8,4) NOT NULL,
    "employer_contribution_rate" DECIMAL(8,4) NOT NULL,
    "eps_rate" DECIMAL(8,4) NOT NULL,
    "admin_charge_rate" DECIMAL(8,4) NOT NULL,
    "edli_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "edli_admin_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "wage_ceiling" DECIMAL(15,2) NOT NULL,
    "vpf_allowed" BOOLEAN NOT NULL DEFAULT true,
    "exemptions" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "pf_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "esi_configurations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "statutory_version_id" UUID NOT NULL,
    "employee_rate" DECIMAL(8,4) NOT NULL,
    "employer_rate" DECIMAL(8,4) NOT NULL,
    "eligibility_ceiling" DECIMAL(15,2) NOT NULL,
    "exemptions" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "esi_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_tax_configurations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "statutory_version_id" UUID NOT NULL,
    "state_code" VARCHAR(10) NOT NULL,
    "state_name" VARCHAR(100) NOT NULL,
    "slabs" JSONB NOT NULL DEFAULT '[]',
    "max_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "exemptions" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "professional_tax_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "income_tax_configurations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "statutory_version_id" UUID NOT NULL,
    "regime" VARCHAR(20) NOT NULL,
    "slabs" JSONB NOT NULL DEFAULT '[]',
    "standard_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "rebate_limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "rebate_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "surcharge_slabs" JSONB NOT NULL DEFAULT '[]',
    "cess_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "income_tax_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_statutory_profiles" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "pf_enabled" BOOLEAN NOT NULL DEFAULT true,
    "esi_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pt_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tds_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tax_regime" VARCHAR(20),
    "financial_year_code" VARCHAR(20),
    "vpf_percentage" DECIMAL(8,4),
    "pf_employee_rate_override" DECIMAL(8,4),
    "pf_employer_rate_override" DECIMAL(8,4),
    "esi_employee_rate_override" DECIMAL(8,4),
    "esi_employer_rate_override" DECIMAL(8,4),
    "pt_exempt" BOOLEAN NOT NULL DEFAULT false,
    "exemptions" JSONB NOT NULL DEFAULT '[]',
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employee_statutory_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investment_declarations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "financial_year_id" UUID NOT NULL,
    "section_80c" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "section_80d" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "home_loan_interest" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "nps" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "education_loan" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "other_deductions" JSONB NOT NULL DEFAULT '{}',
    "proof_documents" JSONB NOT NULL DEFAULT '[]',
    "declaration_status" "investment_declaration_status" NOT NULL DEFAULT 'draft',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "investment_declarations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tax_computations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "payroll_calculation_id" UUID,
    "financial_year_id" UUID NOT NULL,
    "period_month" SMALLINT NOT NULL,
    "period_year" SMALLINT NOT NULL,
    "tax_regime" VARCHAR(20) NOT NULL,
    "projected_annual_income" DECIMAL(15,2) NOT NULL,
    "taxable_income" DECIMAL(15,2) NOT NULL,
    "annual_tax" DECIMAL(15,2) NOT NULL,
    "monthly_tds" DECIMAL(15,2) NOT NULL,
    "standard_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "rebate_applied" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "surcharge" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cess" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "investment_deductions" JSONB NOT NULL DEFAULT '{}',
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_computations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employer_contributions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "payroll_calculation_id" UUID,
    "pf_employer" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "eps" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pf_admin_charges" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "edli" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "esi_employer" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonus_placeholder" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gratuity_placeholder" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "other_contributions" JSONB NOT NULL DEFAULT '{}',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employer_contributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "statutory_audit_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "actor_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "statutory_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_financial_years_company_code" ON "financial_years"("company_id", "code");
CREATE INDEX "idx_financial_years_company_current" ON "financial_years"("company_id", "is_current");
CREATE UNIQUE INDEX "uq_statutory_rules_company_code" ON "statutory_rules"("company_id", "code");
CREATE INDEX "idx_statutory_rules_company_type" ON "statutory_rules"("company_id", "rule_type");
CREATE UNIQUE INDEX "uq_statutory_versions_rule_fy_version" ON "statutory_versions"("statutory_rule_id", "financial_year_id", "version_number");
CREATE INDEX "idx_statutory_versions_company_status" ON "statutory_versions"("company_id", "status");
CREATE UNIQUE INDEX "pf_configurations_statutory_version_id_key" ON "pf_configurations"("statutory_version_id");
CREATE INDEX "idx_pf_configurations_company" ON "pf_configurations"("company_id");
CREATE UNIQUE INDEX "esi_configurations_statutory_version_id_key" ON "esi_configurations"("statutory_version_id");
CREATE INDEX "idx_esi_configurations_company" ON "esi_configurations"("company_id");
CREATE UNIQUE INDEX "professional_tax_configurations_statutory_version_id_key" ON "professional_tax_configurations"("statutory_version_id");
CREATE INDEX "idx_pt_configurations_company_state" ON "professional_tax_configurations"("company_id", "state_code");
CREATE UNIQUE INDEX "income_tax_configurations_statutory_version_id_key" ON "income_tax_configurations"("statutory_version_id");
CREATE INDEX "idx_income_tax_configurations_company_regime" ON "income_tax_configurations"("company_id", "regime");
CREATE UNIQUE INDEX "employee_statutory_profiles_employee_id_key" ON "employee_statutory_profiles"("employee_id");
CREATE INDEX "idx_employee_statutory_profiles_company" ON "employee_statutory_profiles"("company_id");
CREATE UNIQUE INDEX "uq_investment_declarations_employee_fy" ON "investment_declarations"("employee_id", "financial_year_id");
CREATE INDEX "idx_investment_declarations_company_status" ON "investment_declarations"("company_id", "declaration_status");
CREATE UNIQUE INDEX "tax_computations_payroll_calculation_id_key" ON "tax_computations"("payroll_calculation_id");
CREATE INDEX "idx_tax_computations_employee_period" ON "tax_computations"("employee_id", "period_year", "period_month");
CREATE INDEX "idx_tax_computations_company_fy" ON "tax_computations"("company_id", "financial_year_id");
CREATE UNIQUE INDEX "employer_contributions_payroll_calculation_id_key" ON "employer_contributions"("payroll_calculation_id");
CREATE INDEX "idx_employer_contributions_employee_period" ON "employer_contributions"("employee_id", "period_start");
CREATE INDEX "idx_employer_contributions_company" ON "employer_contributions"("company_id");
CREATE INDEX "idx_statutory_audit_logs_company_entity" ON "statutory_audit_logs"("company_id", "entity_type", "created_at");

ALTER TABLE "financial_years" ADD CONSTRAINT "financial_years_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "statutory_rules" ADD CONSTRAINT "statutory_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "statutory_versions" ADD CONSTRAINT "statutory_versions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "statutory_versions" ADD CONSTRAINT "statutory_versions_statutory_rule_id_fkey" FOREIGN KEY ("statutory_rule_id") REFERENCES "statutory_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "statutory_versions" ADD CONSTRAINT "statutory_versions_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pf_configurations" ADD CONSTRAINT "pf_configurations_statutory_version_id_fkey" FOREIGN KEY ("statutory_version_id") REFERENCES "statutory_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "esi_configurations" ADD CONSTRAINT "esi_configurations_statutory_version_id_fkey" FOREIGN KEY ("statutory_version_id") REFERENCES "statutory_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "professional_tax_configurations" ADD CONSTRAINT "professional_tax_configurations_statutory_version_id_fkey" FOREIGN KEY ("statutory_version_id") REFERENCES "statutory_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "income_tax_configurations" ADD CONSTRAINT "income_tax_configurations_statutory_version_id_fkey" FOREIGN KEY ("statutory_version_id") REFERENCES "statutory_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_statutory_profiles" ADD CONSTRAINT "employee_statutory_profiles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investment_declarations" ADD CONSTRAINT "investment_declarations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investment_declarations" ADD CONSTRAINT "investment_declarations_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_computations" ADD CONSTRAINT "tax_computations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_computations" ADD CONSTRAINT "tax_computations_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_computations" ADD CONSTRAINT "tax_computations_payroll_calculation_id_fkey" FOREIGN KEY ("payroll_calculation_id") REFERENCES "payroll_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employer_contributions" ADD CONSTRAINT "employer_contributions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_contributions" ADD CONSTRAINT "employer_contributions_payroll_calculation_id_fkey" FOREIGN KEY ("payroll_calculation_id") REFERENCES "payroll_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
