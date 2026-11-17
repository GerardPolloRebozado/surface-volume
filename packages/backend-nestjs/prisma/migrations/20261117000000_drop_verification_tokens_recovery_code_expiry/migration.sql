-- DropForeignKey
ALTER TABLE "verification_tokens" DROP CONSTRAINT "verification_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "mfa_recovery_codes" DROP COLUMN "used_at",
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "verification_tokens";

-- DropEnum
DROP TYPE "VerificationPurpose";

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_created_at_idx" ON "mfa_recovery_codes"("created_at");

