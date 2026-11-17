-- MFA recovery codes expire 5 minutes after creation.
-- Prisma cannot express functions or triggers, so this migration is hand-written.

-- Deletes every recovery code older than 5 minutes and returns how many were deleted.
-- Can be called directly: SELECT delete_expired_mfa_recovery_codes();
CREATE FUNCTION "delete_expired_mfa_recovery_codes"() RETURNS integer
  LANGUAGE sql AS $$
  WITH deleted AS (
    DELETE FROM "mfa_recovery_codes"
     WHERE "created_at" <= now() - interval '5 minutes'
    RETURNING 1
  )
  SELECT count(*)::integer FROM deleted;
$$;

-- Runs the function above every time codes are inserted, so the table only ever
-- holds codes from the last 5 minutes.
CREATE FUNCTION "mfa_recovery_codes_purge_trigger"() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "delete_expired_mfa_recovery_codes"();
  RETURN NULL;
END $$;

CREATE TRIGGER "mfa_recovery_codes_purge_expired"
  AFTER INSERT ON "mfa_recovery_codes"
  FOR EACH STATEMENT EXECUTE FUNCTION "mfa_recovery_codes_purge_trigger"();
