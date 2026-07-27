-- Employee Document Management Module

CREATE TYPE "document_verification_status" AS ENUM ('pending_verification', 'verified', 'rejected', 'expired', 'archived');
CREATE TYPE "document_access_action" AS ENUM ('view', 'download', 'preview', 'print');

ALTER TABLE "files" ADD COLUMN "thumbnail_key" VARCHAR(500);
ALTER TABLE "files" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "files" ADD COLUMN "deleted_by" UUID;
CREATE INDEX "idx_files_company_category" ON "files"("company_id", "category");

CREATE TABLE "document_categories" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "status" "record_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_document_categories_company_code" ON "document_categories"("company_id", "code");
CREATE INDEX "idx_document_categories_company_status" ON "document_categories"("company_id", "status");

ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate documents -> employee_documents
ALTER TABLE "documents" RENAME TO "employee_documents";

ALTER TABLE "employee_documents" ADD COLUMN "company_id" UUID;
ALTER TABLE "employee_documents" ADD COLUMN "category_id" UUID;
ALTER TABLE "employee_documents" ADD COLUMN "description" TEXT;
ALTER TABLE "employee_documents" ADD COLUMN "document_number" VARCHAR(100);
ALTER TABLE "employee_documents" ADD COLUMN "issue_date" DATE;
ALTER TABLE "employee_documents" ADD COLUMN "issuing_authority" VARCHAR(255);
ALTER TABLE "employee_documents" ADD COLUMN "verification_status" "document_verification_status" NOT NULL DEFAULT 'pending_verification';
ALTER TABLE "employee_documents" ADD COLUMN "status" "record_status" NOT NULL DEFAULT 'active';
ALTER TABLE "employee_documents" ADD COLUMN "updated_by" UUID;
ALTER TABLE "employee_documents" ADD COLUMN "deleted_by" UUID;

UPDATE "employee_documents" ed
SET "company_id" = e."company_id",
    "verification_status" = CASE WHEN ed."verified" = true THEN 'verified'::"document_verification_status" ELSE 'pending_verification'::"document_verification_status" END
FROM "employees" e
WHERE ed."employee_id" = e."id";

ALTER TABLE "employee_documents" ALTER COLUMN "company_id" SET NOT NULL;

CREATE INDEX "idx_employee_documents_company_employee" ON "employee_documents"("company_id", "employee_id");
CREATE INDEX "idx_employee_documents_type" ON "employee_documents"("document_type");
CREATE INDEX "idx_employee_documents_expiry" ON "employee_documents"("expiry_date");
CREATE INDEX "idx_employee_documents_verification" ON "employee_documents"("verification_status");
CREATE INDEX "idx_employee_documents_company_status" ON "employee_documents"("company_id", "verification_status");

ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "document_verifications" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "status" "document_verification_status" NOT NULL,
    "notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_document_verifications_document_date" ON "document_verifications"("document_id", "reviewed_at");

ALTER TABLE "document_verifications" ADD CONSTRAINT "document_verifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "employee_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "document_access_logs" (
    "id" UUID NOT NULL,
    "document_id" UUID,
    "file_id" UUID NOT NULL,
    "user_id" UUID,
    "action" "document_access_action" NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_document_access_logs_file_date" ON "document_access_logs"("file_id", "created_at");
CREATE INDEX "idx_document_access_logs_document_action" ON "document_access_logs"("document_id", "action");

ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "employee_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default system categories
INSERT INTO "document_categories" ("id", "company_id", "code", "name", "description", "is_system", "sort_order", "status", "updated_at")
VALUES
  (gen_random_uuid(), NULL, 'identity', 'Identity', 'Identity documents', true, 1, 'active', CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'employment', 'Employment', 'Employment documents', true, 2, 'active', CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'education', 'Education', 'Education certificates', true, 3, 'active', CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'experience', 'Experience', 'Experience documents', true, 4, 'active', CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'bank', 'Bank', 'Bank documents', true, 5, 'active', CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'medical', 'Medical', 'Medical documents', true, 6, 'active', CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'legal', 'Legal', 'Legal documents', true, 7, 'active', CURRENT_TIMESTAMP),
  (gen_random_uuid(), NULL, 'other', 'Other', 'Other files', true, 8, 'active', CURRENT_TIMESTAMP);
