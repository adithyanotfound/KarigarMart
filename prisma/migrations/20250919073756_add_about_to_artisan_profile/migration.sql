/*
  Warnings:

  - Added the required column `about` to the `artisan_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."artisan_profiles" ADD COLUMN     "about" TEXT;

-- Update existing records with a default value
UPDATE "public"."artisan_profiles" SET "about" = 'No information provided yet.' WHERE "about" IS NULL;

-- Make the column NOT NULL after updating existing records
ALTER TABLE "public"."artisan_profiles" ALTER COLUMN "about" SET NOT NULL;
