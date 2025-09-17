/*
  Warnings:

  - You are about to drop the `OTP` table. All the data in the table will be lost.
  - Added the required column `birthdate` to the `OTP` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactNumber` to the `OTP` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `OTP` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `OTP` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `OTP` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
DROP TABLE "OTP";

-- CreateTable
CREATE TABLE "OTP" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);
