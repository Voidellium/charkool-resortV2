// Server-side Pusher configuration
// Used in API routes to SEND events to connected clients

import Pusher from 'pusher';

// Initialize Pusher server instance
// These credentials should be in your .env.local file
const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

/**
 * Pusher Channel Names (for consistency across the app)
 */
export const CHANNELS = {
  // Booking-related events
  BOOKINGS: 'bookings',
  
  // Room availability updates
  AVAILABILITY: 'availability',

  // Amenity stock updates
  AMENITIES: 'amenities',
  
  // Role-based notification channels
  NOTIFICATIONS_RECEPTIONIST: 'notifications-receptionist',
  NOTIFICATIONS_CASHIER: 'notifications-cashier',
  NOTIFICATIONS_SUPERADMIN: 'notifications-superadmin',
  
  // User-specific channel (for guest updates)
  // Usage: `user-${userId}`
  USER_PREFIX: 'user-',
};

/**
 * Event Names (for consistency across the app)
 */
export const EVENTS = {
  // Booking events
  BOOKING_CREATED: 'booking-created',
  BOOKING_UPDATED: 'booking-updated',
  BOOKING_CANCELLED: 'booking-cancelled',
  BOOKING_CHECKED_IN: 'booking-checked-in',
  BOOKING_CHECKED_OUT: 'booking-checked-out',
  
  // Payment events
  PAYMENT_RECEIVED: 'payment-received',
  PAYMENT_VERIFIED: 'payment-verified',
  PAYMENT_FLAGGED: 'payment-flagged',
  
  // Availability events
  AVAILABILITY_CHANGED: 'availability-changed',
  ROOM_BOOKED: 'room-booked',

  // Amenity events
  AMENITY_STOCK_CHANGED: 'amenity-stock-changed',
  
  // Notification events
  NEW_NOTIFICATION: 'new-notification',
  
  // Guest-specific events
  BOOKING_STATUS_CHANGED: 'booking-status-changed',
};

/**
 * Helper function to trigger a Pusher event
 * @param {string} channel - Channel name
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
export async function triggerEvent(channel, event, data) {
  try {
    await pusherServer.trigger(channel, event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`[Pusher] Triggered ${event} on ${channel}`);
    return true;
  } catch (error) {
    console.error(`[Pusher] Error triggering ${event} on ${channel}:`, error);
    return false;
  }
}

/**
 * Helper function to notify a specific user
 * @param {string|number} userId - User ID
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
export async function notifyUser(userId, event, data) {
  const channel = `${CHANNELS.USER_PREFIX}${userId}`;
  return triggerEvent(channel, event, data);
}

/**
 * Helper function to notify staff by role
 * @param {string} role - Role (RECEPTIONIST, CASHIER, SUPERADMIN)
 * @param {object} data - Notification data
 */
export async function notifyStaff(role, data) {
  const channelMap = {
    RECEPTIONIST: CHANNELS.NOTIFICATIONS_RECEPTIONIST,
    CASHIER: CHANNELS.NOTIFICATIONS_CASHIER,
    SUPERADMIN: CHANNELS.NOTIFICATIONS_SUPERADMIN,
    SUPER_ADMIN: CHANNELS.NOTIFICATIONS_SUPERADMIN,
  };
  
  const channel = channelMap[role.toUpperCase()];
  if (!channel) {
    console.warn(`[Pusher] Unknown role: ${role}`);
    return false;
  }
  
  return triggerEvent(channel, EVENTS.NEW_NOTIFICATION, data);
}

/**
 * Broadcast availability change to all connected clients
 * @param {object} data - Availability data { date, roomType, available }
 */
export async function broadcastAvailabilityChange(data) {
  return triggerEvent(CHANNELS.AVAILABILITY, EVENTS.AVAILABILITY_CHANGED, data);
}

/**
 * Broadcast new booking to relevant channels
 * @param {object} booking - Booking data
 */
export async function broadcastNewBooking(booking) {
  // Notify availability channel (for booking pages)
  await triggerEvent(CHANNELS.AVAILABILITY, EVENTS.ROOM_BOOKED, {
    bookingId: booking.id,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    rooms: booking.rooms,
  });
  
  // Notify bookings channel (for staff dashboards)
  await triggerEvent(CHANNELS.BOOKINGS, EVENTS.BOOKING_CREATED, {
    bookingId: booking.id,
    guestName: booking.guestName || `${booking.firstName} ${booking.lastName}`,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
  });
  
  // Notify all staff roles
  const notificationData = {
    type: 'booking',
    message: `New booking from ${booking.guestName || booking.firstName}`,
    bookingId: booking.id,
  };
  
  await notifyStaff('RECEPTIONIST', notificationData);
  await notifyStaff('CASHIER', notificationData);
  await notifyStaff('SUPERADMIN', notificationData);
  
  return true;
}

export default pusherServer;
