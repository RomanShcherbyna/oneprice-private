/*
  Warnings:

  - You are about to drop the column `telegram_username` on the `client_comments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."client_comments" DROP COLUMN "telegram_username";
