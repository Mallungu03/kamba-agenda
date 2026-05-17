/*
  Warnings:

  - You are about to drop the `opt_codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "opt_codes" DROP CONSTRAINT "opt_codes_userId_fkey";

-- DropTable
DROP TABLE "opt_codes";
