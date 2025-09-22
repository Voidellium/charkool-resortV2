const { PrismaClient, Role } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      name: 'Super Admin',
      firstName: 'Super',
      lastName: 'Admin',
      birthdate: new Date('1980-01-01'),
      contactNumber: '+1234567890',
      email: 'superadmin@example.com',
      password: 'superadmin123',
      role: Role.SUPERADMIN,
    },
  });

  console.log("✅ Super Admin seeded:", superAdmin.email);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      birthdate: new Date('1985-01-01'),
      contactNumber: '+1234567891',
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
      firstName: 'Guest',
      lastName: 'User',
      birthdate: new Date('1990-01-01'),
      contactNumber: '+1234567892',
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

  // Default Amenities for each room type
  console.log("🌟 Seeding default amenities for room types...");

  const defaultAmenities = [
    // LOFT amenities
    { roomType: 'LOFT', amenityName: 'Airconditioned', description: 'Climate controlled room' },
    { roomType: 'LOFT', amenityName: '2 Beds', description: 'Two comfortable beds' },
    { roomType: 'LOFT', amenityName: 'Mini Fridge', description: 'Small refrigerator' },
    { roomType: 'LOFT', amenityName: 'WiFi Access', description: 'High-speed internet' },
    { roomType: 'LOFT', amenityName: 'Pool Access', description: 'Access to swimming pool' },
    { roomType: 'LOFT', amenityName: 'Grill Access', description: 'Access to outdoor grill' },

    // TEPEE amenities
    { roomType: 'TEPEE', amenityName: 'Airconditioned', description: 'Climate controlled room' },
    { roomType: 'TEPEE', amenityName: '5 Beds', description: 'Five comfortable beds' },
    { roomType: 'TEPEE', amenityName: 'Mini Fridge', description: 'Small refrigerator' },
    { roomType: 'TEPEE', amenityName: 'WiFi Access', description: 'High-speed internet' },
    { roomType: 'TEPEE', amenityName: 'Pool Access', description: 'Access to swimming pool' },
    { roomType: 'TEPEE', amenityName: 'Gas & Stove', description: 'Cooking facilities' },
    { roomType: 'TEPEE', amenityName: 'Grill Access', description: 'Access to outdoor grill' },

    // VILLA amenities
    { roomType: 'VILLA', amenityName: 'Airconditioned', description: 'Climate controlled room' },
    { roomType: 'VILLA', amenityName: '10 Beds (5 Double Deck)', description: 'Ten beds in double deck configuration' },
    { roomType: 'VILLA', amenityName: 'Fridge', description: 'Full-size refrigerator' },
    { roomType: 'VILLA', amenityName: 'WiFi Access', description: 'High-speed internet' },
    { roomType: 'VILLA', amenityName: 'Pool Access', description: 'Access to swimming pool' },
    { roomType: 'VILLA', amenityName: 'Gas & Stove', description: 'Cooking facilities' },
    { roomType: 'VILLA', amenityName: 'Grill Access', description: 'Access to outdoor grill' },

    // FAMILY_LODGE amenities
    { roomType: 'FAMILY_LODGE', amenityName: 'Airconditioned', description: 'Climate controlled room' },
    { roomType: 'FAMILY_LODGE', amenityName: '12 Beds', description: 'Twelve comfortable beds' },
    { roomType: 'FAMILY_LODGE', amenityName: 'Fridge', description: 'Full-size refrigerator' },
    { roomType: 'FAMILY_LODGE', amenityName: 'WiFi Access', description: 'High-speed internet' },
    { roomType: 'FAMILY_LODGE', amenityName: 'Pool Access', description: 'Access to swimming pool' },
    { roomType: 'FAMILY_LODGE', amenityName: '2x Gas & Stove', description: 'Two cooking facilities' },
    { roomType: 'FAMILY_LODGE', amenityName: 'Grill Access', description: 'Access to outdoor grill' },
  ];

  for (const amenity of defaultAmenities) {
    await prisma.roomTypeDefaultAmenity.upsert({
      where: {
        roomType_amenityName: {
          roomType: amenity.roomType,
          amenityName: amenity.amenityName
        }
      },
      update: {},
      create: amenity,
    });
  }

  console.log("✅ Default amenities seeded for all room types");

  // Optional Amenities
  console.log("🔧 Seeding optional amenities...");

  const optionalAmenities = [
    { name: 'Broom & Dustpan', description: 'Cleaning set for room', maxQuantity: 1 },
    { name: 'Extra Bed', description: 'Additional sleeping accommodation', maxQuantity: 2 },
    { name: 'Extra Pillow', description: 'Additional pillow for comfort', maxQuantity: 5 },
    { name: 'Extra Blanket', description: 'Additional blanket for warmth', maxQuantity: 3 },
    { name: 'Towels Set', description: 'Complete set of towels', maxQuantity: 2 },
    { name: 'Toiletries Kit', description: 'Basic toiletries', maxQuantity: 2 },
  ];

  for (const amenity of optionalAmenities) {
    await prisma.optionalAmenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: amenity,
    });
  }

  console.log("✅ Optional amenities seeded");

  // Rental Amenities
  console.log("💰 Seeding rental amenities...");

  const rentalAmenities = [
    { name: 'ATV', description: 'All-terrain vehicle rental', pricePerUnit: 20000, unitType: 'hour' },
    { name: 'Island Hopping', description: 'Boat trip to nearby islands', pricePerUnit: 60000, unitType: '3pax' },
    { name: 'Billiard Access', description: 'Access to billiard table', pricePerUnit: 15000, unitType: 'hour' },
    { name: 'Karaoke', description: 'Karaoke machine rental', pricePerUnit: 500, unitType: 'song' },
    { name: 'Banana Boat', description: 'Water recreation activity', pricePerUnit: 70000, unitType: '30minutes' },
    { name: 'Transportation Service', description: 'Door-to-door transport service', pricePerUnit: 500000, unitType: 'trip' },
    { name: 'Kayak Rental', description: 'Single kayak rental', pricePerUnit: 30000, unitType: 'hour' },
    { name: 'Snorkeling Gear', description: 'Complete snorkeling equipment', pricePerUnit: 25000, unitType: 'day' },
  ];

  for (const amenity of rentalAmenities) {
    await prisma.rentalAmenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: amenity,
    });
  }

  console.log("✅ Rental amenities seeded");

  // Cottage Add-on
  console.log("🏠 Seeding cottage add-on...");

  // Check if cottage already exists
  let cottage = await prisma.cottage.findFirst({
    where: { name: "Cottage" }
  });

  if (!cottage) {
    cottage = await prisma.cottage.create({
      data: {
        name: "Cottage",
        price: 30000, // ₱300 in cents
        isActive: true,
      },
    });
  }

  console.log("✅ Cottage add-on seeded");

  // Legacy Amenities (keeping for backward compatibility)
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

  // Amenity Inventory (keeping for backward compatibility)
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

  // Sample Booking with new amenity system
  console.log("📅 Creating sample booking with new amenity system...");

  const sampleBooking = await prisma.booking.create({
    data: {
      userId: guest.id,
      roomId: beachfrontRoom.id,
      checkIn: new Date('2025-07-01'),
      checkOut: new Date('2025-07-05'),
      status: 'confirmed',
      paymentStatus: 'paid',
      totalPrice: 10000,
      // Add optional amenities
      optionalAmenities: {
        create: [
          { optionalAmenityId: 1, quantity: 1 }, // Broom & Dustpan
          { optionalAmenityId: 3, quantity: 2 }, // Extra Pillows
        ],
      },
      // Add rental amenities
      rentalAmenities: {
        create: [
          { rentalAmenityId: 1, quantity: 2, hoursUsed: 2, totalPrice: 40000 }, // ATV for 2 hours
          { rentalAmenityId: 3, quantity: 1, hoursUsed: 1, totalPrice: 15000 }, // Billiard for 1 hour
        ],
      },
      // Add cottage
      cottage: {
        create: [
          { cottageId: cottage.id, quantity: 1, totalPrice: 30000 },
        ],
      },
      // Legacy amenities (keeping for backward compatibility)
      amenities: {
        create: [
          { amenityInventoryId: 1 },
          { amenityInventoryId: 2 },
        ],
      },
    },
  });

  console.log("✅ Sample booking created with comprehensive amenities");
  console.log('✅ Seeding complete with comprehensive room amenities system!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
