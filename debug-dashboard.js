// Quick debug script to test the dashboard API call
async function testDashboardAPI() {
  try {
    console.log('Testing dashboard API call...');
    
    const response = await fetch('http://localhost:3000/api/bookings?limit=1000');
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error('Response not OK:', response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('Response structure:', Object.keys(data));
    console.log('Has bookings array:', Array.isArray(data.bookings));
    console.log('Bookings count:', data.bookings?.length || 0);
    console.log('Pagination info:', data.pagination);
    
    if (data.bookings && data.bookings.length > 0) {
      const sampleBooking = data.bookings[0];
      console.log('Sample booking status:', sampleBooking.status);
      console.log('Sample booking structure:', Object.keys(sampleBooking));
    }
    
  } catch (error) {
    console.error('Error testing dashboard API:', error);
  }
}

// Run if this is being executed directly
if (typeof window === 'undefined') {
  testDashboardAPI();
}