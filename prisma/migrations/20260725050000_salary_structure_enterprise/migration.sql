-- Salary Structure Enterprise Migration

CREATE TYPE "salary_calculation_type" AS ENUM ('fixed', 'percentage', 'formula', 'manual', 'computed');
CREATE TYPE "salary_approval_status" AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE "salary_template_scope" AS ENUM ('department', 'designation', 'employee', 'branch');

CREATE TABLE "component_categories" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "category_type" "salary_component_type" NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "component_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pay_grades" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "level" SMALLINT NOT NULL DEFAULT 1,
    "min_ctc" DECIMAL(15,2),
    "max_ctc" DECIMAL(15,2),
    "description" TEXT,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "pay_grades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "salary_formulas" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "expression" TEXT NOT NULL,
    "description" TEXT,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "salary_formulas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "salary_structures" ADD COLUMN IF NOT EXISTS "pay_grade_id" UUID;
ALTER TABLE "salary_structures" ADD COLUMN IF NOT EXISTS "monthly_ctc_default" DECIMAL(15,2);
ALTER TABLE "salary_structures" ADD COLUMN IF NOT EXISTS "annual_ctc_default" DECIMAL(15,2);
ALTER TABLE "salary_structures" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "category_id" UUID;
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "formula_id" UUID;
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "calculation_type" "salary_calculation_type" NOT NULL DEFAULT 'fixed';
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "percentage_of" VARCHAR(50);
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "percentage_value" DECIMAL(8,4);
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "formula_expression" TEXT;
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "is_employer_contribution" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "affects_gross" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "salary_components" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

CREATE TABLE "salary_templates" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "salary_structure_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "scope" "salary_template_scope" NOT NULL,
    "branch_id" UUID,
    "department_id" UUID,
    "designation_id" UUID,
    "employee_id" UUID,
    "priority" SMALLINT NOT NULL DEFAULT 0,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "salary_templates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "company_id" UUID;
UPDATE "employee_salaries" es SET "company_id" = e."company_id" FROM "employees" e WHERE es."employee_id" = e."id" AND es."company_id" IS NULL;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "pay_grade_id" UUID;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "monthly_ctc" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "annual_ctc" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "gross_placeholder" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "net_placeholder" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "employer_contribution" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "employee_contribution" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "approval_status" "salary_approval_status" NOT NULL DEFAULT 'draft';
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "approved_by" UUID;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
ALTER TABLE "employee_salaries" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

CREATE TABLE "salary_revisions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "employee_salary_id" UUID,
    "previous_salary" DECIMAL(15,2) NOT NULL,
    "new_salary" DECIMAL(15,2) NOT NULL,
    "previous_ctc" DECIMAL(15,2),
    "new_ctc" DECIMAL(15,2),
    "effective_date" DATE NOT NULL,
    "reason" TEXT,
    "revision_type" VARCHAR(50),
    "approval_status" "salary_approval_status" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "salary_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_component_categories_company_code" ON "component_categories"("company_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pay_grades_company_code" ON "pay_grades"("company_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_salary_formulas_company_code" ON "salary_formulas"("company_id", "code");

ALTER TABLE "component_categories" ADD CONSTRAINT "component_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pay_grades" ADD CONSTRAINT "pay_grades_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "salary_formulas" ADD CONSTRAINT "salary_formulas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_pay_grade_id_fkey" FOREIGN KEY ("pay_grade_id") REFERENCES "pay_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "component_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "salary_formulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "salary_templates" ADD CONSTRAINT "salary_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "salary_templates" ADD CONSTRAINT "salary_templates_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_pay_grade_id_fkey" FOREIGN KEY ("pay_grade_id") REFERENCES "pay_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_employee_salary_id_fkey" FOREIGN KEY ("employee_salary_id") REFERENCES "employee_salaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
