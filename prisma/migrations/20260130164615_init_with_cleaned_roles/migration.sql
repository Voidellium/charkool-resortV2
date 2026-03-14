-- CreateEnum
CREATE TYPE "RescheduleStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "CancellationStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('Confirmed', 'Pending', 'Cancelled', 'Held', 'Completed', 'Expired', 'CancellationPending', 'ReschedulePending');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Paid', 'Pending', 'Partial', 'Reservation', 'Cancelled', 'Refunded');

-- CreateEnum
CREATE TYPE "PaymentVerificationStatus" AS ENUM ('Unverified', 'Verified', 'Flagged');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'SUPERADMIN', 'RECEPTIONIST', 'CASHIER', 'AMENITYINVENTORYMANAGER');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('STANDARD', 'DELUXE', 'SUITE', 'BEACHFRONT', 'TEPEE', 'LOFT', 'FAMILY_LODGE', 'VILLA');

-- CreateEnum
CREATE TYPE "AmenityType" AS ENUM ('DEFAULT', 'OPTIONAL', 'RENTAL');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('ERROR', 'WARNING', 'INFO', 'DEBUG');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('RESORT_MAP', 'INTERIOR_TEEPEE', 'INTERIOR_VILLA', 'INTERIOR_LOFT');

-- CreateTable
CREATE TABLE "RescheduleRequest" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "userId" INTEGER,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldCheckIn" TIMESTAMP(3) NOT NULL,
    "oldCheckOut" TIMESTAMP(3) NOT NULL,
    "newCheckIn" TIMESTAMP(3) NOT NULL,
    "newCheckOut" TIMESTAMP(3) NOT NULL,
    "status" "RescheduleStatus" NOT NULL DEFAULT 'PENDING',
    "context" TEXT,
    "adminContext" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedById" INTEGER,
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationRequest" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "userId" INTEGER,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "status" "CancellationStatus" NOT NULL DEFAULT 'PENDING',
    "adminContext" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedById" INTEGER,
    "refundAmount" INTEGER,

    CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "image" TEXT,
    "redirectUrl" TEXT DEFAULT '/guest/dashboard',
    "emailVerified" TIMESTAMP(3),
    "googleId" TEXT,
    "pendingGoogleLink" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "failedPaymentAttempts" INTEGER NOT NULL DEFAULT 0,
    "paymentCooldownUntil" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
    "browserFingerprint" TEXT,
    "userAgent" TEXT,
    "password" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoomType" NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heldUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'available',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomTypeDefaultAmenity" (
    "id" SERIAL NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "amenityName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" INTEGER,

    CONSTRAINT "RoomTypeDefaultAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionalAmenity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionalAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalAmenity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePerUnit" INTEGER NOT NULL,
    "pricePerHour" INTEGER,
    "unitType" TEXT NOT NULL,
    "unitNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cottage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Cottage',
    "price" INTEGER NOT NULL DEFAULT 30000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cottage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "roomId" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmenityInventory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT 'General',
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmenityInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmenityCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmenityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmenityLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "amenityName" TEXT NOT NULL,
    "user" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmenityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "actualCheckIn" TIMESTAMP(3),
    "actualCheckOut" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heldUntil" TIMESTAMP(3),
    "guestName" TEXT NOT NULL DEFAULT 'Walk-in Guest',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "totalPrice" INTEGER NOT NULL DEFAULT 0,
    "numberOfGuests" INTEGER NOT NULL DEFAULT 1,
    "paymentMode" TEXT NOT NULL DEFAULT 'cash',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "cancellationRemarks" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingOptionalAmenity" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "optionalAmenityId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BookingOptionalAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRentalAmenity" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "rentalAmenityId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "hoursUsed" INTEGER,
    "totalPrice" INTEGER NOT NULL,

    CONSTRAINT "BookingRentalAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingCottage" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "cottageId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" INTEGER NOT NULL,

    CONSTRAINT "BookingCottage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRoom" (
    "bookingId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "additionalPax" INTEGER NOT NULL DEFAULT 0,
    "children" INTEGER NOT NULL DEFAULT 0,
    "additionalPaxFee" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BookingRoom_pkey" PRIMARY KEY ("bookingId","roomId")
);

-- CreateTable
CREATE TABLE "BookingAmenity" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "amenityInventoryId" INTEGER NOT NULL,

    CONSTRAINT "BookingAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "provider" TEXT NOT NULL DEFAULT 'paymongo',
    "method" TEXT,
    "referenceId" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verificationStatus" "PaymentVerificationStatus" NOT NULL DEFAULT 'Unverified',
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "flagReason" TEXT,
    "receiptNumber" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bookingId" INTEGER,
    "userId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRemark" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "authorRole" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingRemark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotQA" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "hasBookNow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotQA_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Promotion" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTrail" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreeDModel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "ThreeDModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" SERIAL NOT NULL,
    "level" "LogLevel" NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "endpoint" TEXT,
    "userId" INTEGER,
    "userRole" "Role",
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" INTEGER,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDateConfiguration" (
    "id" SERIAL NOT NULL,
    "maxBookingMonths" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "BookingDateConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisabledBookingDate" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "DisabledBookingDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomUnitAssignment" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" INTEGER,

    CONSTRAINT "RoomUnitAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomUnitMetadata" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomUnitMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreeDModelConfig" (
    "id" SERIAL NOT NULL,
    "modelType" "ModelType" NOT NULL,
    "modelPath" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "ThreeDModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoomTypeDefaultAmenity_roomType_amenityName_key" ON "RoomTypeDefaultAmenity"("roomType", "amenityName");

-- CreateIndex
CREATE UNIQUE INDEX "OptionalAmenity_name_key" ON "OptionalAmenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RentalAmenity_name_key" ON "RentalAmenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AmenityCategory_name_key" ON "AmenityCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BookingOptionalAmenity_bookingId_optionalAmenityId_key" ON "BookingOptionalAmenity"("bookingId", "optionalAmenityId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRentalAmenity_bookingId_rentalAmenityId_key" ON "BookingRentalAmenity"("bookingId", "rentalAmenityId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingCottage_bookingId_cottageId_key" ON "BookingCottage"("bookingId", "cottageId");

-- CreateIndex
CREATE INDEX "BookingRemark_bookingId_idx" ON "BookingRemark"("bookingId");

-- CreateIndex
CREATE INDEX "BookingRemark_authorId_idx" ON "BookingRemark"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotQA_question_key" ON "ChatbotQA"("question");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedBrowser_browserFingerprint_key" ON "TrustedBrowser"("browserFingerprint");

-- CreateIndex
CREATE INDEX "AuditTrail_actorId_idx" ON "AuditTrail"("actorId");

-- CreateIndex
CREATE INDEX "AuditTrail_timestamp_idx" ON "AuditTrail"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ThreeDModel_name_key" ON "ThreeDModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ThreeDModel_fileName_key" ON "ThreeDModel"("fileName");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_category_idx" ON "SystemLog"("category");

-- CreateIndex
CREATE INDEX "SystemLog_timestamp_idx" ON "SystemLog"("timestamp");

-- CreateIndex
CREATE INDEX "SystemLog_resolved_idx" ON "SystemLog"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "DisabledBookingDate_date_key" ON "DisabledBookingDate"("date");

-- CreateIndex
CREATE INDEX "DisabledBookingDate_date_idx" ON "DisabledBookingDate"("date");

-- CreateIndex
CREATE INDEX "RoomUnitAssignment_roomId_unitNumber_idx" ON "RoomUnitAssignment"("roomId", "unitNumber");

-- CreateIndex
CREATE INDEX "RoomUnitAssignment_bookingId_idx" ON "RoomUnitAssignment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomUnitAssignment_bookingId_roomId_unitNumber_key" ON "RoomUnitAssignment"("bookingId", "roomId", "unitNumber");

-- CreateIndex
CREATE INDEX "RoomUnitMetadata_roomId_idx" ON "RoomUnitMetadata"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomUnitMetadata_roomId_unitNumber_key" ON "RoomUnitMetadata"("roomId", "unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ThreeDModelConfig_modelType_key" ON "ThreeDModelConfig"("modelType");

-- CreateIndex
CREATE INDEX "ThreeDModelConfig_modelType_idx" ON "ThreeDModelConfig"("modelType");

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTypeDefaultAmenity" ADD CONSTRAINT "RoomTypeDefaultAmenity_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingOptionalAmenity" ADD CONSTRAINT "BookingOptionalAmenity_optionalAmenityId_fkey" FOREIGN KEY ("optionalAmenityId") REFERENCES "OptionalAmenity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingOptionalAmenity" ADD CONSTRAINT "BookingOptionalAmenity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRentalAmenity" ADD CONSTRAINT "BookingRentalAmenity_rentalAmenityId_fkey" FOREIGN KEY ("rentalAmenityId") REFERENCES "RentalAmenity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRentalAmenity" ADD CONSTRAINT "BookingRentalAmenity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCottage" ADD CONSTRAINT "BookingCottage_cottageId_fkey" FOREIGN KEY ("cottageId") REFERENCES "Cottage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCottage" ADD CONSTRAINT "BookingCottage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRoom" ADD CONSTRAINT "BookingRoom_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRoom" ADD CONSTRAINT "BookingRoom_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAmenity" ADD CONSTRAINT "BookingAmenity_amenityInventoryId_fkey" FOREIGN KEY ("amenityInventoryId") REFERENCES "AmenityInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAmenity" ADD CONSTRAINT "BookingAmenity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRemark" ADD CONSTRAINT "BookingRemark_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRemark" ADD CONSTRAINT "BookingRemark_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedBrowser" ADD CONSTRAINT "TrustedBrowser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeDModel" ADD CONSTRAINT "ThreeDModel_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDateConfiguration" ADD CONSTRAINT "BookingDateConfiguration_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisabledBookingDate" ADD CONSTRAINT "DisabledBookingDate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomUnitAssignment" ADD CONSTRAINT "RoomUnitAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomUnitAssignment" ADD CONSTRAINT "RoomUnitAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomUnitAssignment" ADD CONSTRAINT "RoomUnitAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomUnitMetadata" ADD CONSTRAINT "RoomUnitMetadata_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeDModelConfig" ADD CONSTRAINT "ThreeDModelConfig_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
