// Client-side Pusher configuration
// Used in React components to RECEIVE events

import PusherClient from 'pusher-js';

// Singleton pattern - only create one Pusher instance
let pusherInstance = null;
// Track if Pusher failed to connect (to avoid repeated error logs)
let pusherDisabled = false;
let connectionErrorLogged = false;

/**
 * Get or create the Pusher client instance
 * @returns {PusherClient} Pusher client instance
 */
export function getPusherClient() {
  if (typeof window === 'undefined') {
    // Return null on server-side
    return null;
  }

  // If Pusher was disabled due to connection failure, return null
  if (pusherDisabled) {
    return null;
  }

  // Check if Pusher credentials are available
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!pusherKey || !pusherCluster) {
    if (!connectionErrorLogged) {
      console.warn('[Pusher] Missing credentials. Real-time features disabled.');
      console.warn('[Pusher] Make sure NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER are set in .env');
      connectionErrorLogged = true;
    }
    return null;
  }

  if (!pusherInstance) {
    try {
      pusherInstance = new PusherClient(pusherKey, {
        cluster: pusherCluster,
        // Enable encryption
        forceTLS: true,
        // Reconnection settings
        activityTimeout: 120000, // 2 minutes
        pongTimeout: 30000, // 30 seconds
      });

      // Always bind error handler to handle connection failures gracefully
      pusherInstance.connection.bind('error', (error) => {
        if (!connectionErrorLogged) {
          // Empty error object {} typically means invalid credentials
          const errorMsg = Object.keys(error || {}).length === 0
            ? 'Invalid or expired Pusher credentials. Please verify your PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, and PUSHER_SECRET in .env'
            : JSON.stringify(error);
          console.warn('[Pusher] Connection failed:', errorMsg);
          console.warn('[Pusher] Real-time features disabled. The app will continue to work without real-time updates.');
          connectionErrorLogged = true;
        }
      });

      // Handle refused connection (invalid credentials)
      pusherInstance.connection.bind('state_change', (states) => {
        if (states.current === 'unavailable' || states.current === 'failed') {
          if (!connectionErrorLogged) {
            console.warn('[Pusher] Connection unavailable. Real-time features disabled.');
            connectionErrorLogged = true;
          }
          pusherDisabled = true;
        }
      });

      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        pusherInstance.connection.bind('connected', () => {
          console.log('[Pusher] Connected successfully');
          connectionErrorLogged = false; // Reset on successful connection
        });

        pusherInstance.connection.bind('disconnected', () => {
          console.log('[Pusher] Disconnected');
        });
      }
    } catch (err) {
      console.warn('[Pusher] Failed to initialize:', err.message);
      pusherDisabled = true;
      return null;
    }
  }

  return pusherInstance;
}

/**
 * Channel Names (must match server-side)
 */
export const CHANNELS = {
  BOOKINGS: 'bookings',
  AVAILABILITY: 'availability',
  AMENITIES: 'amenities',
  NOTIFICATIONS_RECEPTIONIST: 'notifications-receptionist',
  NOTIFICATIONS_CASHIER: 'notifications-cashier',
  NOTIFICATIONS_SUPERADMIN: 'notifications-superadmin',
  USER_PREFIX: 'user-',
};

/**
 * Event Names (must match server-side)
 */
export const EVENTS = {
  BOOKING_CREATED: 'booking-created',
  BOOKING_UPDATED: 'booking-updated',
  BOOKING_CANCELLED: 'booking-cancelled',
  BOOKING_CHECKED_IN: 'booking-checked-in',
  BOOKING_CHECKED_OUT: 'booking-checked-out',
  PAYMENT_RECEIVED: 'payment-received',
  PAYMENT_VERIFIED: 'payment-verified',
  PAYMENT_FLAGGED: 'payment-flagged',
  AVAILABILITY_CHANGED: 'availability-changed',
  ROOM_BOOKED: 'room-booked',
  AMENITY_STOCK_CHANGED: 'amenity-stock-changed',
  NEW_NOTIFICATION: 'new-notification',
  BOOKING_STATUS_CHANGED: 'booking-status-changed',
};

/**
 * Subscribe to a channel
 * @param {string} channelName - Name of the channel
 * @returns {object} Channel instance
 */
export function subscribeToChannel(channelName) {
  const pusher = getPusherClient();
  if (!pusher) return null;
  
  return pusher.subscribe(channelName);
}

/**
 * Unsubscribe from a channel
 * @param {string} channelName - Name of the channel
 */
export function unsubscribeFromChannel(channelName) {
  const pusher = getPusherClient();
  if (!pusher) return;
  
  pusher.unsubscribe(channelName);
}

/**
 * Get user-specific channel name
 * @param {string|number} userId - User ID
 * @returns {string} Channel name
 */
export function getUserChannel(userId) {
  return `${CHANNELS.USER_PREFIX}${userId}`;
}

export default getPusherClient;
