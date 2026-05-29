-- DropForeignKey
ALTER TABLE "ChatEscalation" DROP CONSTRAINT "ChatEscalation_userId_fkey";

-- AlterTable
ALTER TABLE "ChatEscalation" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ChatEscalation" ADD CONSTRAINT "ChatEscalation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
