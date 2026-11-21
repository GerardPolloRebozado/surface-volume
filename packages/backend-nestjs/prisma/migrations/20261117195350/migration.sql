/*
  Warnings:

  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_replaced_by_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "sessions";
