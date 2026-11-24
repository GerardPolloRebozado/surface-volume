CREATE TABLE "authentication_refresh_tokens" (
  "id" TEXT PRIMARY KEY,
  "family_id" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "family_expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "claims" JSONB
);

CREATE INDEX "authentication_refresh_tokens_family_id_idx"
  ON "authentication_refresh_tokens" ("family_id");
CREATE INDEX "authentication_refresh_tokens_user_id_idx"
  ON "authentication_refresh_tokens" ("user_id");
CREATE INDEX "authentication_refresh_tokens_expires_at_idx"
  ON "authentication_refresh_tokens" ("expires_at");

CREATE TABLE "authentication_refresh_token_families" (
  "family_id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "revoked_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX "authentication_refresh_token_families_user_id_idx"
  ON "authentication_refresh_token_families" ("user_id");

CREATE TABLE "authentication_email_tokens" (
  "id" TEXT PRIMARY KEY,
  "purpose" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "email" CITEXT NOT NULL,
  "fingerprint" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX "authentication_email_tokens_user_id_purpose_idx"
  ON "authentication_email_tokens" ("user_id", "purpose");
CREATE INDEX "authentication_email_tokens_expires_at_idx"
  ON "authentication_email_tokens" ("expires_at");
