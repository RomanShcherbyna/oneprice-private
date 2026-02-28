-- Re-apply chat and private fields for production database.
-- This migration is idempotent: it only creates types/columns if they do not exist.

DO $$
BEGIN
  -- Ensure enum type exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MessageAuthorType'
  ) THEN
    CREATE TYPE "MessageAuthorType" AS ENUM ('CLIENT', 'ADMIN');
  END IF;

  -- Ensure new columns on properties
  ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "contact_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "private_note" TEXT;

  -- Ensure new columns on client_comments
  ALTER TABLE "client_comments"
  ADD COLUMN IF NOT EXISTS "author_name" TEXT,
  ADD COLUMN IF NOT EXISTS "author_type" "MessageAuthorType" NOT NULL DEFAULT 'CLIENT';

  -- Backfill author_name only if legacy telegram_username column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'client_comments'
      AND column_name = 'telegram_username'
  ) THEN
    UPDATE "client_comments"
    SET "author_name" = COALESCE("telegram_username", 'Клиент')
    WHERE "author_name" IS NULL;
  END IF;
END $$;

