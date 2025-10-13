/**
 * Test script to create sample notifications for demonstrating the notification system
 * Run this with: node create-test-notifications.mjs
 */

const testNotifications = [
  {
    type: 'booking_created',
    message: 'New booking #12345 has been created for Premium Suite',
    metadata: { bookingId: 12345, roomType: 'Premium Suite' }
  },
  {
    type: 'payment_received',
    message: 'Payment of ₱5,500 received for booking #12344',
    metadata: { amount: 5500, bookingId: 12344 }
  },
  {
    type: 'user_registered',
    message: 'New guest registered: John Smith (johnsmith@email.com)',
    metadata: { guestName: 'John Smith', email: 'johnsmith@email.com' }
  },
  {
    type: 'room_maintenance',
    message: 'Room 301 requires maintenance - Plumbing issue reported',
    metadata: { roomNumber: 301, issueType: 'Plumbing' }
  },
  {
    type: 'system_alert',
    message: 'High booking volume detected - Consider dynamic pricing adjustment',
    metadata: { alertType: 'high_volume' }
  },
  {
    type: 'booking_cancelled',
    message: 'Booking #12340 has been cancelled - Refund processed',
    metadata: { bookingId: 12340, refundAmount: 3200 }
  },
  {
    type: 'payment_failed',
    message: 'Payment failed for booking #12339 - Customer notified',
    metadata: { bookingId: 12339, reason: 'insufficient_funds' }
  },
  {
    type: 'room_cleaned',
    message: 'Room 205 cleaning completed and ready for next guest',
    metadata: { roomNumber: 205 }
  }
];

async function createTestNotifications() {
  console.log('🔔 Creating test notifications for demonstration...\n');

  for (const [index, notification] of testNotifications.entries()) {
    try {
      const response = await fetch('http://localhost:3000/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...notification,
          userId: 'super-admin-test',
          role: 'superadmin'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Created notification ${index + 1}/${testNotifications.length}: ${notification.type}`);
        console.log(`   Message: ${notification.message}`);
        console.log(`   ID: ${result.id}\n`);
        
        // Add a small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to create notification ${index + 1}:`, errorText);
      }
    } catch (error) {
      console.error(`❌ Error creating notification ${index + 1}:`, error.message);
    }
  }

  console.log('🎉 Test notifications creation completed!');
  console.log('\n📋 To test the notification system:');
  console.log('1. Start your Next.js development server: npm run dev');
  console.log('2. Navigate to /super-admin in your browser');
  console.log('3. Click the notification bell to see the dropdown');
  console.log('4. Visit /super-admin/notifications to see the full notification page');
  console.log('5. Click on unread notifications to mark them as read');
  console.log('\n💡 Pro tip: You can run this script multiple times to create more test data!');
}

// Check if we're running this file directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestNotifications().catch(console.error);
}

export { createTestNotifications };