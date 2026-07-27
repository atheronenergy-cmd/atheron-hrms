-- User management extensions: status values, phone, invitations

ALTER TYPE "user_status" ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE "user_status" ADD VALUE IF NOT EXISTS 'pending_verification';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);

CREATE TABLE IF NOT EXISTS "user_invitations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_invitations_token_key" ON "user_invitations"("token");
CREATE INDEX IF NOT EXISTS "idx_user_invitations_user_id" ON "user_invitations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_invitations_expires" ON "user_invitations"("expires");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_invitations_user_id_fkey') THEN
        ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
