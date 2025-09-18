// Simple test script to test booking creation
const testBookingCreation = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guestName: 'Test Guest',
        checkIn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        roomId: 1, // Assuming room with ID 1 exists
        amenityIds: [], // No amenities for now
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID'
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);

  } catch (error) {
    console.error('Test failed:', error);
  }
};

testBookingCreation();
