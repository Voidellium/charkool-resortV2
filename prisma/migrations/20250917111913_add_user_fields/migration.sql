/*
  Warnings:

  - Added the required column `birthdate` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactNumber` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthdate" TIMESTAMP(3) NOT NULL DEFAULT '2000-01-01 00:00:00'::timestamp,
ADD COLUMN     "contactNumber" TEXT NOT NULL DEFAULT '00000000000',
ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "middleName" TEXT;
