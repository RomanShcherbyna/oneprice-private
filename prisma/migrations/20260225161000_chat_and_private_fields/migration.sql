-- CreateEnum
CREATE TYPE "MessageAuthorType" AS ENUM ('CLIENT', 'ADMIN');

-- AlterTable
ALTER TABLE "properties"
ADD COLUMN "contact_phone" TEXT,
ADD COLUMN "private_note" TEXT;

-- AlterTable
ALTER TABLE "client_comments"
ADD COLUMN "author_name" TEXT,
ADD COLUMN "author_type" "MessageAuthorType" NOT NULL DEFAULT 'CLIENT';

-- Backfill existing rows
UPDATE "client_comments"
SET "author_name" = COALESCE("telegram_username", 'Клиент')
WHERE "author_name" IS NULL;
