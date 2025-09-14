const { PrismaClient, Role } = require('@prisma/client'); 
const prisma = new PrismaClient();

async function main() {
  // Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: 'superadmin123',
      role: Role.SUPERADMIN, // ✅ Works if enum exists
    },
  });

  console.log("✅ Super Admin seeded:", superAdmin.email);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: Role.ADMIN,
    },
  });

  const guest = await prisma.user.upsert({
    where: { email: 'guest@example.com' },
    update: {},
    create: {
      name: 'Guest User',
      email: 'guest@example.com',
      password: 'guest123',
      role: Role.GUEST,
    },
  });

  // Rooms
  const standardRoom = await prisma.room.upsert({
    where: { name: 'Loft' },
    update: {},
    create: {
      name: 'Loft',
      type: 'LOFT',
      price: 1500,
      status: 'available',
    },
  });

  const deluxeRoom = await prisma.room.upsert({
    where: { name: 'Tepee' },
    update: {},
    create: {
      name: 'Tepee',
      type: 'TEPEE',
      price: 3000,
      status: 'available',
    },
  });

  const suiteRoom = await prisma.room.upsert({
    where: { name: 'Villa' },
    update: {},
    create: {
      name: 'Villa',
      type: 'VILLA',
      price: 4000,
      status: 'available',
    },
  });

  const beachfrontRoom = await prisma.room.upsert({
    where: { name: 'Family Lodge' },
    update: {},
    create: {
      name: 'Family Lodge',
      type: 'FAMILY_LODGE',
      price: 5000,
      status: 'available',
    },
  });

  // Amenities
  await prisma.amenity.createMany({
    data: [
      { name: 'Air Conditioning', roomId: standardRoom.id },
      { name: 'Wi-Fi', roomId: standardRoom.id },
      { name: 'TV', roomId: deluxeRoom.id },
      { name: 'Mini Fridge', roomId: deluxeRoom.id },
      { name: 'Jacuzzi', roomId: suiteRoom.id },
      { name: 'Ocean View', roomId: beachfrontRoom.id },
    ],
    skipDuplicates: true,
  });

  // Amenity Inventory
  await prisma.amenityInventory.createMany({
    data: [
      { name: 'Free WiFi', quantity: 100 },
      { name: 'Breakfast Included', quantity: 100 },
      { name: 'Pool Access', quantity: 100 },
      { name: 'Air Conditioning', quantity: 100 },
      { name: 'Private Bathroom', quantity: 100 },
    ],
    skipDuplicates: true,
  });

  // Sample Booking
  await prisma.booking.create({
    data: {
      userId: guest.id,
      roomId: beachfrontRoom.id,
      checkIn: new Date('2025-07-01'),
      checkOut: new Date('2025-07-05'),
      status: 'confirmed',
      paymentStatus: 'paid',
      totalPrice: 10000,
      amenities: {
        create: [
          { amenityInventoryId: 1 },
          { amenityInventoryId: 2 },
        ],
      },
    },
  });

  console.log('✅ Seeding complete with Super Admin, Admin, and Guest!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
