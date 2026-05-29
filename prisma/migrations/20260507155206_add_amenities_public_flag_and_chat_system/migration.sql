-- AlterTable
ALTER TABLE "Cottage" ADD COLUMN     "isPublicVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "OptionalAmenity" ADD COLUMN     "isPublicVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "RentalAmenity" ADD COLUMN     "isPublicVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "guestEmail" TEXT,
    "message" TEXT NOT NULL,
    "senderType" TEXT NOT NULL DEFAULT 'guest',
    "isBotMatched" BOOLEAN NOT NULL DEFAULT false,
    "botResponse" TEXT,
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "adminReply" TEXT,
    "resolvedBy" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatEscalation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "contactedAt" TIMESTAMP(3),
    "contactedBy" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "ChatMessage"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_isEscalated_idx" ON "ChatMessage"("isEscalated");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ChatEscalation_userId_idx" ON "ChatEscalation"("userId");

-- CreateIndex
CREATE INDEX "ChatEscalation_status_idx" ON "ChatEscalation"("status");

-- CreateIndex
CREATE INDEX "ChatEscalation_createdAt_idx" ON "ChatEscalation"("createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatEscalation" ADD CONSTRAINT "ChatEscalation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatEscalation" ADD CONSTRAINT "ChatEscalation_contactedBy_fkey" FOREIGN KEY ("contactedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
