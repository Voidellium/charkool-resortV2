const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleQuestions = [
  // 🏡 Rooms & Rates
  {
    question: "What types of rooms do you offer?",
    answer: "We offer different room types such as Villa Rooms, Loft Rooms, and Tepee Rooms. Each room includes basic amenities such as access to the pool, beach, and free use of gasul and cooking wares.",
    category: "Rooms & Rates",
    hasBookNow: false
  },
  {
    question: "What are your room rates?",
    answer: "Teepee Room — P 6000/ 22 hrs (max 5 pax) — with specific room inclusion\n• Loft Room — P 5000/ 22 hrs (2–4 pax) —with specific room inclusion\n• Villa Room — P 8000 / 22 hrs (max 8 pax) — with specific room inclusion\nWould you like to book now and see additional details?",
    category: "Rooms & Rates",
    hasBookNow: true
  },
  {
    question: "Do you offer promos or discounts?",
    answer: "Yes, we occasionally offer seasonal promotions. Please check our Facebook page or contact our staff for the latest deals.",
    category: "Rooms & Rates",
    hasBookNow: false
  },

  // 📅 Booking & Reservations
  {
    question: "How do I book a room?",
    answer: "You can book online through our system by choosing your room, selecting your dates, and making a down payment via PayMongo. Walk-ins are also accepted, but online booking ensures availability.",
    category: "Booking & Reservations",
    hasBookNow: false
  },
  {
    question: "How much is the down payment?",
    answer: "The down payment is at the standard of P 2000 for reservation. Would you like book now to for additional details?",
    category: "Booking & Reservations",
    hasBookNow: true
  },
  {
    question: "Can I book on the same day?",
    answer: "Yes, same-day bookings are allowed as long as the rooms are still available. We recommend checking online before visiting.",
    category: "Booking & Reservations",
    hasBookNow: false
  },
  {
    question: "What happens if two guests try to book the same room?",
    answer: "Our system temporarily locks the room during payment to prevent double booking. If payment fails or times out, the room becomes available again.",
    category: "Booking & Reservations",
    hasBookNow: false
  },

  // 🎉 Amenities & Activities
  {
    question: "What amenities are free to use?",
    answer: "Free amenities include the swimming pool, beach access, Free Wifi and free use of Gasul and Cooking wares (Only in Villa and Tepee)",
    category: "Amenities & Activities",
    hasBookNow: false
  },
  {
    question: "What amenities have extra charges?",
    answer: "Some special amenities or equipment may require additional fees. Would you like book now to for additional details?",
    category: "Amenities & Activities",
    hasBookNow: true
  },
  {
    question: "Do you have grillers, billiards, and videoke?",
    answer: "Yes, grillers, billiards, and videoke are available for guests. Grillers and cooking facilities are part of the free amenities.",
    category: "Amenities & Activities",
    hasBookNow: false
  },
  {
    question: "What activities do you offer?",
    answer: "Guests can enjoy water activities such as banana boat rides, dragon boat, and island hopping. These are arranged separately with our staff.",
    category: "Amenities & Activities",
    hasBookNow: false
  },
  {
    question: "Can I request amenities in advance?",
    answer: "Yes, during your booking, you can pre-request items so our staff can prepare them before your arrival.",
    category: "Amenities & Activities",
    hasBookNow: false
  },

  // 💳 Payments & Cancellations
  {
    question: "What payment methods do you accept?",
    answer: "We accept online payments through PayMongo, which supports GCash, Maya, BPI, and other options. Walk-ins may pay in cash.",
    category: "Payments & Cancellations",
    hasBookNow: false
  },
  {
    question: "How do I pay online?",
    answer: "Once you complete your booking details, you'll be redirected to PayMongo where you can choose your preferred payment method. A receipt will appear and you may able to download it",
    category: "Payments & Cancellations",
    hasBookNow: false
  },
  {
    question: "What is your cancellation policy?",
    answer: "Cancellations are allowed within a specific time frame before the booking date. Refunds depend on how early the cancellation is made.",
    category: "Payments & Cancellations",
    hasBookNow: false
  },
  {
    question: "Can I rebook my reservation?",
    answer: "Yes, rebooking is allowed depending on availability and subject to our policies. Please see our policies in our website.",
    category: "Payments & Cancellations",
    hasBookNow: false
  },

  // 📍 Location & Policies
  {
    question: "Where is Charkool Beach Resort located?",
    answer: "We are located in Liwa-Liwa, Zambales. Our exact address and directions are available on Google Maps and Waze.",
    category: "Location & Policies",
    hasBookNow: false
  },
  {
    question: "Do you allow walk-in guests?",
    answer: "Yes, we accept walk-in guests, but we recommend booking online first to secure your room and avoid unavailability.",
    category: "Location & Policies",
    hasBookNow: true
  },
  {
    question: "Do you have corkage fees?",
    answer: "Yes, corkage fees may apply to certain items brought by guests. Please confirm with our staff before your visit.",
    category: "Location & Policies",
    hasBookNow: false
  },
  {
    question: "Do you allow pets?",
    answer: "At this time, pets are not allowed in the resort to ensure cleanliness and safety for all guests.",
    category: "Location & Policies",
    hasBookNow: false
  }
];

async function seedChatbotQuestions() {
  try {
    console.log('Seeding chatbot questions...');

    // Clear existing questions
    await prisma.chatbotQA.deleteMany({});
    console.log('Cleared existing questions');

    // Add new questions
    for (const question of sampleQuestions) {
      await prisma.chatbotQA.create({
        data: question
      });
    }

    console.log('Successfully seeded chatbot questions!');
    console.log(`Added ${sampleQuestions.length} questions`);

  } catch (error) {
    console.error('Error seeding chatbot questions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedChatbotQuestions();
