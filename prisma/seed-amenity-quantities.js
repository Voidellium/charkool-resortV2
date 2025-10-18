const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Set quantity for all Optional Amenities to 50
  await prisma.optionalAmenity.updateMany({
    data: { quantity: 50 }
  });

  // Set quantity for all Rental Amenities to 5
  await prisma.rentalAmenity.updateMany({
    data: { quantity: 5 }
  });

  console.log('✅ Quantities updated for Optional and Rental Amenities');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });