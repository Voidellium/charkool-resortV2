-- CreateTable
CREATE TABLE "TrustedBrowser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "browserFingerprint" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustedBrowser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustedBrowser_browserFingerprint_key" ON "TrustedBrowser"("browserFingerprint");

-- AddForeignKey
ALTER TABLE "TrustedBrowser" ADD CONSTRAINT "TrustedBrowser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
