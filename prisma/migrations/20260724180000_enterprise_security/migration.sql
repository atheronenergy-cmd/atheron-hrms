-- Enterprise Security — 2FA, Devices, Policies, Events

CREATE TYPE "security_event_severity" AS ENUM ('info', 'warning', 'critical');

CREATE TABLE "security_policies" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "require_two_factor" BOOLEAN NOT NULL DEFAULT false,
    "password_min_length" SMALLINT NOT NULL DEFAULT 12,
    "password_require_upper" BOOLEAN NOT NULL DEFAULT true,
    "password_require_lower" BOOLEAN NOT NULL DEFAULT true,
    "password_require_number" BOOLEAN NOT NULL DEFAULT true,
    "password_require_special" BOOLEAN NOT NULL DEFAULT true,
    "password_expiry_days" SMALLINT,
    "password_history_count" SMALLINT NOT NULL DEFAULT 5,
    "max_login_attempts" SMALLINT NOT NULL DEFAULT 5,
    "lockout_minutes" SMALLINT NOT NULL DEFAULT 15,
    "session_timeout_minutes" SMALLINT NOT NULL DEFAULT 1440,
    "max_concurrent_sessions" SMALLINT NOT NULL DEFAULT 5,
    "ip_allowlist" JSONB NOT NULL DEFAULT '[]',
    "device_restrictions" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "security_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "security_policies_company_id_key" ON "security_policies"("company_id");

CREATE TABLE "pending_two_factor_auth" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "remember_me" BOOLEAN NOT NULL DEFAULT false,
    "expires" TIMESTAMPTZ NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_two_factor_auth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_two_factor_auth_token_key" ON "pending_two_factor_auth"("token");
CREATE INDEX "idx_pending_2fa_user_id" ON "pending_two_factor_auth"("user_id");
CREATE INDEX "idx_pending_2fa_expires" ON "pending_two_factor_auth"("expires");

CREATE TABLE "user_recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_user_recovery_codes_user_id" ON "user_recovery_codes"("user_id");

CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fingerprint" VARCHAR(255) NOT NULL,
    "device_label" VARCHAR(255),
    "browser" VARCHAR(100),
    "os" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "location" VARCHAR(255),
    "is_trusted" BOOLEAN NOT NULL DEFAULT false,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_user_devices_user_fingerprint" ON "user_devices"("user_id", "fingerprint");
CREATE INDEX "idx_user_devices_user_id" ON "user_devices"("user_id");

CREATE TABLE "password_histories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_password_history_user_created" ON "password_histories"("user_id", "created_at" DESC);

CREATE TABLE "security_events" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "user_id" UUID,
    "event_type" VARCHAR(100) NOT NULL,
    "severity" "security_event_severity" NOT NULL DEFAULT 'info',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "device_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_security_events_company_created" ON "security_events"("company_id", "created_at" DESC);
CREATE INDEX "idx_security_events_user_id" ON "security_events"("user_id");
CREATE INDEX "idx_security_events_event_type" ON "security_events"("event_type");

ALTER TABLE "sessions" ADD COLUMN "device_id" UUID;
ALTER TABLE "sessions" ADD COLUMN "location" VARCHAR(255);
ALTER TABLE "sessions" ADD COLUMN "is_trusted" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "idx_sessions_device_id" ON "sessions"("device_id");

ALTER TABLE "login_histories" ADD COLUMN "browser" VARCHAR(100);
ALTER TABLE "login_histories" ADD COLUMN "os" VARCHAR(100);
ALTER TABLE "login_histories" ADD COLUMN "device_label" VARCHAR(255);
ALTER TABLE "login_histories" ADD COLUMN "location" VARCHAR(255);

ALTER TABLE "security_policies" ADD CONSTRAINT "security_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pending_two_factor_auth" ADD CONSTRAINT "pending_two_factor_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_recovery_codes" ADD CONSTRAINT "user_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_histories" ADD CONSTRAINT "password_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
