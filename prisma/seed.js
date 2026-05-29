const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Hashing passwords...');
  
  // Hash all passwords upfront
  const hashedPasswords = {
    superadmin: await bcrypt.hash('superadmin123', 10),
    customer: await bcrypt.hash('customer123', 10),
    receptionist: await bcrypt.hash('receptionist123', 10),
    cashier: await bcrypt.hash('cashier123', 10),
    amenitymanager: await bcrypt.hash('amenitymanager123', 10),
  };

  console.log('✅ Passwords hashed');

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
      password: hashedPasswords.superadmin,
      role: Role.SUPERADMIN,
    },
  });

  console.log("✅ Super Admin seeded:", superAdmin.email);

  // Customer user (for testing customer bookings)
  const customer = await prisma.user.upsert({
    where: { email: 'guest@example.com' },
    update: {
      role: Role.CUSTOMER, // Ensure existing guest user has correct role
    },
    create: {
      name: 'Customer User',
      firstName: 'Customer',
      lastName: 'User',
      birthdate: new Date('1990-01-01'),
      contactNumber: '+1234567892',
      email: 'guest@example.com',
      password: hashedPasswords.customer,
      role: Role.CUSTOMER,
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: 'receptionist@example.com' },
    update: {},
    create: {
      name: 'Receptionist User',
      firstName: 'Receptionist',
      lastName: 'User',
      birthdate: new Date('1992-01-01'),
      contactNumber: '+1234567893',
      email: 'receptionist@example.com',
      password: hashedPasswords.receptionist,
      role: Role.RECEPTIONIST,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@example.com' },
    update: {},
    create: {
      name: 'Cashier User',
      firstName: 'Cashier',
      lastName: 'User',
      birthdate: new Date('1988-01-01'),
      contactNumber: '+1234567894',
      email: 'cashier@example.com',
      password: hashedPasswords.cashier,
      role: Role.CASHIER,
    },
  });

  const amenityManager = await prisma.user.upsert({
    where: { email: 'amenitymanager@example.com' },
    update: {},
    create: {
      name: 'Amenity Manager',
      firstName: 'Amenity',
      lastName: 'Manager',
      birthdate: new Date('1989-01-01'),
      contactNumber: '+1234567896',
      email: 'amenitymanager@example.com',
      password: hashedPasswords.amenitymanager,
      role: Role.AMENITYINVENTORYMANAGER,
    },
  });

  console.log("✅ All user roles seeded");

  // Rooms
  const standardRoom = await prisma.room.upsert({
    where: { name: 'Loft' },
    update: {},
    create: {
      name: 'Loft',
      type: 'LOFT',
      price: 500000, // ₱5,000.00
      status: 'available',
      quantity: 4, // 4 Loft units available
    },
  });

  const deluxeRoom = await prisma.room.upsert({
    where: { name: 'Tepee' },
    update: {},
    create: {
      name: 'Tepee',
      type: 'TEPEE',
      price: 600000, // ₱6,000.00
      status: 'available',
      quantity: 4, // 4 Tepee units available
    },
  });

  const suiteRoom = await prisma.room.upsert({
    where: { name: 'Villa' },
    update: {},
    create: {
      name: 'Villa',
      type: 'VILLA',
      price: 800000, // ₱8,000.00
      status: 'available',
      quantity: 4, // 4 Villa units available
    },
  });

  const beachfrontRoom = await prisma.room.upsert({
    where: { name: 'Family Lodge' },
    update: {},
    create: {
      name: 'Family Lodge',
      type: 'FAMILY_LODGE',
      price: 1600000, // ₱16,000.00
      status: 'available',
      quantity: 1, // 1 Family Lodge unit available
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
    { name: 'Extra Pillow', description: 'Additional pillow for comfort', maxQuantity: 5 },
    { name: 'Extra Blanket', description: 'Additional blanket for warmth', maxQuantity: 3 },
    { name: 'Towels Set', description: 'Complete set of towels', maxQuantity: 2 },
  ];

  const createdOptionalAmenities = [];
  for (const amenity of optionalAmenities) {
    const created = await prisma.optionalAmenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: amenity,
    });
    createdOptionalAmenities.push(created);
  }

  console.log("✅ Optional amenities seeded");

  // Rental Amenities
  console.log("💰 Seeding rental amenities...");

  const rentalAmenities = [
    { name: 'ATV', description: 'All-terrain vehicle rental', pricePerUnit: 20000, unitType: 'Hour' }, // ₱200
    { name: 'Island Hopping', description: 'Boat trip to nearby islands', pricePerUnit: 60000, unitType: '3pax' }, // ₱600
    { name: 'Banana Boat', description: 'Water recreation activity', pricePerUnit: 70000, unitType: '30minutes' }, // ₱700
    { name: 'Kayak Rental', description: 'Single kayak rental', pricePerUnit: 30000, unitType: 'hour' },
    { name: 'Snorkeling Gear', description: 'Complete snorkeling equipment', pricePerUnit: 25000, unitType: 'day' },
  ];

  const createdRentalAmenities = [];
  for (const amenity of rentalAmenities) {
    const created = await prisma.rentalAmenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: amenity,
    });
    createdRentalAmenities.push(created);
  }

  console.log("✅ Rental amenities seeded");

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
  console.log("📦 Seeding amenity inventory...");
  
  const amenityInventory = [
    { name: 'Broom & Dustpan', quantity: 48, category: 'Cleaning Supplies' },
    { name: 'Extra Bed', quantity: 48, category: 'Furniture' },
    { name: 'Extra Blanket', quantity: 48, category: 'Bedding' },
    { name: 'Extra Pillow', quantity: 50, category: 'Bedding' },
    { name: 'Toiletries Kit', quantity: 47, category: 'Bathroom Essentials' },
    { name: 'Towels Set', quantity: 49, category: 'Bathroom Essentials' },
    { name: 'Free WiFi', quantity: 100, category: 'General' },
    { name: 'Breakfast Included', quantity: 100, category: 'General' },
    { name: 'Pool Access', quantity: 100, category: 'General' },
    { name: 'Air Conditioning', quantity: 100, category: 'General' },
    { name: 'Private Bathroom', quantity: 100, category: 'General' },
  ];

  // Use createMany since AmenityInventory doesn't have unique constraint on name
  await prisma.amenityInventory.createMany({
    data: amenityInventory,
    skipDuplicates: true,
  });

  console.log("✅ Amenity inventory seeded");

  // Sample Booking with new amenity system
  console.log("📅 Creating sample booking with new amenity system...");

  // Find the amenity inventory items first
  const wifiAmenity = await prisma.amenityInventory.findFirst({ where: { name: 'Free WiFi' } });
  const breakfastAmenity = await prisma.amenityInventory.findFirst({ where: { name: 'Breakfast Included' } });

  const sampleBooking = await prisma.booking.create({
    data: {
      user: { connect: { id: customer.id } },
      rooms: { create: [{ room: { connect: { id: beachfrontRoom.id } }, quantity: 1 }] },
      checkIn: new Date('2025-07-01'),
      checkOut: new Date('2025-07-05'),
      status: 'Confirmed',
      paymentStatus: 'Paid',
      totalPrice: 10000,
      // Add optional amenities - using actual created amenity IDs
      optionalAmenities: {
        create: [
          { optionalAmenity: { connect: { id: createdOptionalAmenities[0].id } }, quantity: 2 }, // Extra Pillows
          { optionalAmenity: { connect: { id: createdOptionalAmenities[2].id } }, quantity: 1 }, // Towels Set
        ],
      },
      // Add rental amenities - using actual created amenity IDs
      rentalAmenities: {
        create: [
          { rentalAmenity: { connect: { id: createdRentalAmenities[0].id } }, quantity: 2, hoursUsed: 2, totalPrice: 40000 }, // ATV for 2 hours
          { rentalAmenity: { connect: { id: createdRentalAmenities[1].id } }, quantity: 1, hoursUsed: 1, totalPrice: 60000 }, // Island Hopping
        ],
      },
      // Legacy amenities (keeping for backward compatibility)
      amenities: {
        create: [
          { amenityInventoryId: wifiAmenity.id },
          { amenityInventoryId: breakfastAmenity.id },
        ],
      },
    },
  });

  console.log("✅ Sample booking created with comprehensive amenities");

  // Policies
  console.log("📋 Seeding policies...");

  const policies = [
    {
      title: "Check-in/Check-out Policy",
      content: "Check-in time is 2:00 PM and check-out time is 12:00 PM. Early check-in and late check-out may be arranged subject to availability and additional charges.",
      order: 1,
    },
    {
      title: "Cancellation Policy",
      content: "Cancellations made 7 days or more before check-in will receive a full refund of the reservation fee. Cancellations made within 7 days of check-in are non-refundable.",
      order: 2,
    },
    {
      title: "Reschedule Policy",
      content: "Rescheduling requests must be submitted at least 3 days before the original check-in date. One free reschedule is allowed per booking, subject to room availability.",
      order: 3,
    },
    {
      title: "Payment Policy",
      content: "A reservation fee is required to confirm your booking. Full payment must be completed before check-in. We accept cash, GCash, Maya, and credit/debit cards.",
      order: 4,
    },
    {
      title: "House Rules",
      content: "No smoking inside rooms. No pets allowed. Maximum occupancy must be observed. Additional pax charges apply (₱400 per person, max 2 additional). Quiet hours from 10:00 PM to 7:00 AM.",
      order: 5,
    },
    {
      title: "Damage Policy",
      content: "Guests are responsible for any damage to room property or resort facilities. Charges for damages will be billed to the guest's account.",
      order: 6,
    },
  ];

  for (const policy of policies) {
    await prisma.policy.upsert({
      where: { id: policy.order },
      update: policy,
      create: policy,
    });
  }

  console.log("✅ Policies seeded");

  // Chatbot QA
  console.log("🤖 Seeding chatbot Q&A...");

  const chatbotQAs = [
    // 🏡 Rooms & Rates
    {
      category: "Rooms & Rates",
      question: "What types of rooms do you offer?",
      answer: "We offer different room types such as Villa Rooms, Loft Rooms, and Tepee Rooms. Each room includes basic amenities such as access to the pool, beach, and free use of gasul and cooking wares.",
      hasBookNow: false,
    },
    {
      category: "Rooms & Rates",
      question: "What are your room rates?",
      answer: "Teepee Room — P 6000/ 22 hrs (max 5 pax) — with specific room inclusion\n• Loft Room — P 5000/ 22 hrs (2–4 pax) —with specific room inclusion\n• Villa Room — P 8000 / 22 hrs (max 8 pax) — with specific room inclusion\nWould you like to book now and see additional details?",
      hasBookNow: true,
    },
    {
      category: "Rooms & Rates",
      question: "Do you offer promos or discounts?",
      answer: "Yes, we occasionally offer seasonal promotions. Please check our Facebook page or contact our staff for the latest deals.",
      hasBookNow: false,
    },
    // 📅 Booking & Reservations
    {
      category: "Booking & Reservations",
      question: "How do I book a room?",
      answer: "You can book online through our system by choosing your room, selecting your dates, and making a down payment via PayMongo. Walk-ins are also accepted, but online booking ensures availability.",
      hasBookNow: false,
    },
    {
      category: "Booking & Reservations",
      question: "How much is the down payment?",
      answer: "The down payment is at the standard of P 2000 for reservation. Would you like book now to for additional details?",
      hasBookNow: true,
    },
    {
      category: "Booking & Reservations",
      question: "Can I book on the same day?",
      answer: "Yes, same-day bookings are allowed as long as the rooms are still available. We recommend checking online before visiting.",
      hasBookNow: false,
    },
    {
      category: "Booking & Reservations",
      question: "What happens if two guests try to book the same room?",
      answer: "Our system temporarily locks the room during payment to prevent double booking. If payment fails or times out, the room becomes available again.",
      hasBookNow: false,
    },
    // 🎉 Amenities & Activities
    {
      category: "Amenities & Activities",
      question: "What amenities are free to use?",
      answer: "Free amenities include the swimming pool, beach access, Free Wifi and free use of Gasul and Cooking wares (Only in Villa and Tepee)",
      hasBookNow: false,
    },
    {
      category: "Amenities & Activities",
      question: "What amenities have extra charges?",
      answer: "Some special amenities or equipment may require additional fees. Would you like book now to for additional details?",
      hasBookNow: true,
    },
    {
      category: "Amenities & Activities",
      question: "Do you have grillers, billiards, and videoke?",
      answer: "Yes, grillers, billiards, and videoke are available for guests. Grillers and cooking facilities are part of the free amenities.",
      hasBookNow: false,
    },
    {
      category: "Amenities & Activities",
      question: "What activities do you offer?",
      answer: "Guests can enjoy water activities such as banana boat rides, dragon boat, and island hopping. These are arranged separately with our staff.",
      hasBookNow: false,
    },
    {
      category: "Amenities & Activities",
      question: "Can I request amenities in advance?",
      answer: "Yes, during your booking, you can pre-request items so our staff can prepare them before your arrival.",
      hasBookNow: false,
    },
    // 💳 Payments & Cancellations
    {
      category: "Payments & Cancellations",
      question: "What payment methods do you accept?",
      answer: "We accept online payments through PayMongo, which supports GCash, Maya, BPI, and other options. Walk-ins may pay in cash.",
      hasBookNow: false,
    },
    {
      category: "Payments & Cancellations",
      question: "How do I pay online?",
      answer: "Once you complete your booking details, you'll be redirected to PayMongo where you can choose your preferred payment method. A receipt will appear and you may able to download it",
      hasBookNow: false,
    },
    {
      category: "Payments & Cancellations",
      question: "What is your cancellation policy?",
      answer: "Cancellations are allowed within a specific time frame before the booking date. Refunds depend on how early the cancellation is made.",
      hasBookNow: false,
    },
    {
      category: "Payments & Cancellations",
      question: "Can I rebook my reservation?",
      answer: "Yes, rebooking is allowed depending on availability and subject to our policies. Please see our policies in our website.",
      hasBookNow: false,
    },
    // 📍 Location & Policies
    {
      category: "Location & Policies",
      question: "Where is Charkool Beach Resort located?",
      answer: "We are located in Liwa-Liwa, Zambales. Our exact address and directions are available on Google Maps and Waze.",
      hasBookNow: false,
    },
    {
      category: "Location & Policies",
      question: "Do you allow walk-in guests?",
      answer: "Yes, we accept walk-in guests, but we recommend booking online first to secure your room and avoid unavailability.",
      hasBookNow: true,
    },
    {
      category: "Location & Policies",
      question: "Do you have corkage fees?",
      answer: "Yes, corkage fees may apply to certain items brought by guests. Please confirm with our staff before your visit.",
      hasBookNow: false,
    },
    {
      category: "Location & Policies",
      question: "Do you allow pets?",
      answer: "At this time, pets are not allowed in the resort to ensure cleanliness and safety for all guests.",
      hasBookNow: false,
    },
  ];

  for (const qa of chatbotQAs) {
    await prisma.chatbotQA.upsert({
      where: { question: qa.question },
      update: qa,
      create: qa,
    });
  }

  console.log("✅ Chatbot Q&A seeded");

  // Booking Date Configuration
  console.log("📅 Seeding booking date configuration...");

  const existingConfig = await prisma.bookingDateConfiguration.findFirst();
  if (!existingConfig) {
    await prisma.bookingDateConfiguration.create({
      data: {
        maxBookingMonths: 2,
        updatedBy: superAdmin.id,
      },
    });
    console.log("✅ Booking date configuration created (max 2 months ahead)");
  } else {
    console.log("✅ Booking date configuration already exists");
  }

  // 3D Model Configuration
  console.log("🎨 Seeding 3D model configuration...");

  const modelConfigs = [
    {
      modelType: 'RESORT_MAP',
      modelPath: '/models/WholeMap_12.glb',
      updatedBy: superAdmin.id,
    },
    {
      modelType: 'INTERIOR_TEEPEE',
      modelPath: '/models/Interior_Teepee.glb',
      updatedBy: superAdmin.id,
    },
    {
      modelType: 'INTERIOR_VILLA',
      modelPath: '/models/Interior_Villa.glb',
      updatedBy: superAdmin.id,
    },
    {
      modelType: 'INTERIOR_LOFT',
      modelPath: '/models/Interior_Loft.glb',
      updatedBy: superAdmin.id,
    },
  ];

  for (const config of modelConfigs) {
    await prisma.threeDModelConfig.upsert({
      where: { modelType: config.modelType },
      update: { modelPath: config.modelPath, updatedBy: config.updatedBy },
      create: config,
    });
  }

  console.log("✅ 3D model configuration seeded");

  // 3D Model Records
  console.log("🎨 Seeding 3D model records...");

  const threeDModels = [
    {
      name: 'Resort Main Map',
      fileName: 'WholeMap_Separated_Textured.gltf',
      filePath: '/models/WholeMap_Separated_Textured.gltf',
      fileType: 'GLTF',
      isActive: true,
      uploadedBy: superAdmin.id,
      description: 'Current resort 3D model with separated textured components',
    },
    {
      name: 'Villa Model',
      fileName: 'Villa.gltf',
      filePath: '/models/Villa.gltf',
      fileType: 'GLTF',
      isActive: false,
      uploadedBy: superAdmin.id,
      description: 'Individual villa 3D model',
    },
    {
      name: 'Bilyaran Store',
      fileName: 'BilyaranStore.obj',
      filePath: '/models/BilyaranStore.obj',
      fileType: 'OBJ',
      isActive: false,
      uploadedBy: superAdmin.id,
      description: 'Store building 3D model',
    },
    {
      name: 'Poolside Kubo',
      fileName: 'PoolsideKubo.obj',
      filePath: '/models/PoolsideKubo.obj',
      fileType: 'OBJ',
      isActive: false,
      uploadedBy: superAdmin.id,
      description: 'Poolside kubo structure',
    },
    {
      name: 'Stage',
      fileName: 'Stage.obj',
      filePath: '/models/Stage.obj',
      fileType: 'OBJ',
      isActive: false,
      uploadedBy: superAdmin.id,
      description: 'Performance stage 3D model',
    },
    {
      name: 'Teepee',
      fileName: 'Teepee.obj',
      filePath: '/models/Teepee.obj',
      fileType: 'OBJ',
      isActive: false,
      uploadedBy: superAdmin.id,
      description: 'Teepee accommodation model',
    },
  ];

  for (const model of threeDModels) {
    await prisma.threeDModel.upsert({
      where: { fileName: model.fileName },
      update: { isActive: model.isActive, uploadedBy: model.uploadedBy },
      create: model,
    });
  }

  console.log("✅ 3D model records seeded");

  // Room Unit Metadata (for room unit assignment system)
  console.log("🏨 Seeding room unit metadata...");

  const roomUnitMetadata = [
    // Loft units
    { roomId: standardRoom.id, unitNumber: '1', location: 'Ground Floor', isActive: true },
    { roomId: standardRoom.id, unitNumber: '2', location: 'Second Floor', isActive: true },
    { roomId: standardRoom.id, unitNumber: '3', location: 'Third Floor', isActive: true },
    { roomId: standardRoom.id, unitNumber: '4', location: 'Fourth Floor', isActive: true },
    
    // Tepee units
    { roomId: deluxeRoom.id, unitNumber: '1', location: 'Beachfront', isActive: true },
    { roomId: deluxeRoom.id, unitNumber: '2', location: 'Garden Area', isActive: true },
    { roomId: deluxeRoom.id, unitNumber: '3', location: 'Pool Area', isActive: true },
    { roomId: deluxeRoom.id, unitNumber: '4', location: 'Hillside', isActive: true },
    
    // Villa units
    { roomId: suiteRoom.id, unitNumber: '1', location: 'Beachfront Prime', isActive: true },
    { roomId: suiteRoom.id, unitNumber: '2', location: 'Corner Unit', isActive: true },
    { roomId: suiteRoom.id, unitNumber: '3', location: 'Garden View', isActive: true },
    { roomId: suiteRoom.id, unitNumber: '4', location: 'Poolside', isActive: true },
    
    // Family Lodge units
    { roomId: beachfrontRoom.id, unitNumber: '1', location: 'Main Building', isActive: true },
  ];

  for (const metadata of roomUnitMetadata) {
    await prisma.roomUnitMetadata.upsert({
      where: {
        roomId_unitNumber: {
          roomId: metadata.roomId,
          unitNumber: metadata.unitNumber,
        },
      },
      update: metadata,
      create: metadata,
    });
  }

  console.log("✅ Room unit metadata seeded");

  // Promotions
  console.log("🎉 Seeding promotions...");

  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const promotions = [
    {
      title: "Summer Getaway Special",
      description: "Get 15% off on all room bookings for the summer season!",
      image: "/images/promotions/summer-special.jpg",
      discountType: "percentage",
      discountValue: 1500, // 15%
      targetType: "booking",
      isActive: true,
      startDate: now,
      endDate: threeMonthsFromNow,
    },
    {
      title: "Weekend Warrior Deal",
      description: "₱500 off on weekend bookings (Friday-Sunday)",
      image: "/images/promotions/weekend-deal.jpg",
      discountType: "fixed",
      discountValue: 50000, // ₱500 in cents
      targetType: "booking",
      isActive: true,
      startDate: now,
      endDate: oneMonthFromNow,
    },
    {
      title: "Family Package",
      description: "Book a Family Lodge and get free cottage rental!",
      image: "/images/promotions/family-package.jpg",
      discountType: "fixed",
      discountValue: 30000, // ₱300 cottage value
      targetType: "room",
      isActive: true,
      startDate: now,
      endDate: threeMonthsFromNow,
    },
  ];

  for (let i = 0; i < promotions.length; i++) {
    const promo = promotions[i];
    await prisma.promotion.upsert({
      where: { id: i + 1 },
      update: promo,
      create: { id: i + 1, ...promo },
    });
  }

  console.log("✅ Promotions seeded");

  console.log('✅ Seeding complete with comprehensive data for all models!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
