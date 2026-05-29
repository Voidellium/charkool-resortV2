-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "appliedPromotionId" INTEGER,
ADD COLUMN     "discountAmount" INTEGER,
ADD COLUMN     "discountAppliedAt" TIMESTAMP(3),
ADD COLUMN     "discountAppliedById" INTEGER,
ADD COLUMN     "discountAppliedByRole" "Role",
ADD COLUMN     "discountLabel" TEXT,
ADD COLUMN     "discountTypeSnapshot" TEXT,
ADD COLUMN     "discountValueSnapshot" INTEGER,
ADD COLUMN     "totalAfterDiscount" INTEGER,
ADD COLUMN     "totalBeforeDiscount" INTEGER;
