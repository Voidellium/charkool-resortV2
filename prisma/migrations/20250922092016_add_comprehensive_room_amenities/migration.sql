-- CreateEnum
CREATE TYPE "AmenityType" AS ENUM ('DEFAULT', 'OPTIONAL', 'RENTAL');

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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
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

-- CreateIndex
CREATE UNIQUE INDEX "RoomTypeDefaultAmenity_roomType_amenityName_key" ON "RoomTypeDefaultAmenity"("roomType", "amenityName");

-- CreateIndex
CREATE UNIQUE INDEX "OptionalAmenity_name_key" ON "OptionalAmenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RentalAmenity_name_key" ON "RentalAmenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BookingOptionalAmenity_bookingId_optionalAmenityId_key" ON "BookingOptionalAmenity"("bookingId", "optionalAmenityId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRentalAmenity_bookingId_rentalAmenityId_key" ON "BookingRentalAmenity"("bookingId", "rentalAmenityId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingCottage_bookingId_cottageId_key" ON "BookingCottage"("bookingId", "cottageId");

-- AddForeignKey
ALTER TABLE "RoomTypeDefaultAmenity" ADD CONSTRAINT "RoomTypeDefaultAmenity_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
