-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoomType" ADD VALUE 'STANDARD';
ALTER TYPE "RoomType" ADD VALUE 'DELUXE';
ALTER TYPE "RoomType" ADD VALUE 'SUITE';
ALTER TYPE "RoomType" ADD VALUE 'BEACHFRONT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "redirectUrl" TEXT DEFAULT '/guest/dashboard';
