import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

// Sample booking notifications for testing
const bookingNotifications = [
  {
    message: "Your booking for Deluxe Ocean View Suite has been confirmed! Check-in: Dec 25, 2024",
    type: "booking_confirmed",
    role: "guest",
    userId: "user_123" // Replace with actual user ID
  },
  {
    message: "Your booking for Presidential Villa has been approved by management",
    type: "booking_approved", 
    role: "guest",
    userId: "user_123"
  },
  {
    message: "Unfortunately, your booking for Penthouse Suite could not be approved due to maintenance",
    type: "booking_disapproved",
    role: "guest", 
    userId: "user_123"
  },
  {
    message: "New booking created for Garden View Room - Booking ID: #BK2024001",
    type: "booking_created",
    role: "guest",
    userId: "user_123"
  },
  {
    message: "Your booking has been updated - Check-in date changed to Jan 15, 2025",
    type: "booking_updated",
    role: "guest",
    userId: "user_123"
  },
  {
    message: "Booking cancellation confirmed - Full refund will be processed within 3-5 business days",
    type: "booking_cancelled",
    role: "guest",
    userId: "user_123"
  },
  {
    message: "Payment of $2,450 received for your Ocean Villa booking - Confirmation #PAY789",
    type: "payment_received",
    role: "guest",
    userId: "user_123"
  },
  {
    message: "Payment failed for booking #BK2024001 - Please update your payment method",
    type: "payment_failed",
    role: "guest",
    userId: "user_123"
  }
];

async function createBookingNotifications() {
  console.log('🏨 Creating booking-related notifications...\n');
  
  for (const notification of bookingNotifications) {
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Created: ${notification.type} - ${notification.message.substring(0, 50)}...`);
      } else {
        console.log(`❌ Failed to create ${notification.type}: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error creating ${notification.type}:`, error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n🎉 Booking notifications created! Check your header notification bell.');
  console.log('💡 Tip: Change the userId in this script to match your actual user ID.');
}

createBookingNotifications();