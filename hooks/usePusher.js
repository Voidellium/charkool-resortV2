'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getPusherClient, CHANNELS, EVENTS } from '@/lib/pusher-client';

/**
 * Custom hook to subscribe to a Pusher channel and listen for events
 * 
 * @param {string} channelName - The channel to subscribe to
 * @param {object} eventHandlers - Object mapping event names to handler functions
 * @param {boolean} enabled - Whether the subscription should be active (default: true)
 * 
 * @example
 * // Subscribe to bookings channel
 * usePusher('bookings', {
 *   'booking-created': (data) => {
 *     console.log('New booking:', data);
 *     refetchBookings();
 *   },
 *   'booking-cancelled': (data) => {
 *     console.log('Booking cancelled:', data);
 *   }
 * });
 */
export function usePusher(channelName, eventHandlers = {}, enabled = true) {
  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!enabled || !channelName) return;

    const pusher = getPusherClient();
    if (!pusher) {
      // Pusher not available (missing credentials or disabled)
      setIsAvailable(false);
      setConnectionState('unavailable');
      return;
    }

    setIsAvailable(true);

    // Track connection state
    const handleConnectionChange = (state) => {
      setConnectionState(state.current);
      setIsConnected(state.current === 'connected');
      // Mark as unavailable if connection failed
      if (state.current === 'unavailable' || state.current === 'failed') {
        setIsAvailable(false);
      }
    };

    pusher.connection.bind('state_change', handleConnectionChange);

    // Subscribe to channel
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Bind all event handlers
    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      if (typeof handler === 'function') {
        channel.bind(eventName, handler);
      }
    });

    // Cleanup
    return () => {
      pusher.connection.unbind('state_change', handleConnectionChange);
      
      // Unbind all handlers
      Object.entries(eventHandlers).forEach(([eventName, handler]) => {
        if (typeof handler === 'function') {
          channel.unbind(eventName, handler);
        }
      });

      // Unsubscribe from channel
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName, enabled]); // Note: eventHandlers intentionally excluded to avoid rebinding

  return { isConnected, connectionState, isAvailable };
}

/**
 * Hook for staff notifications (Receptionist, Cashier, SuperAdmin)
 * 
 * @param {string} role - The staff role
 * @param {function} onNotification - Callback when notification received
 * 
 * @example
 * useStaffNotifications('RECEPTIONIST', (notification) => {
 *   showToast(notification.message);
 *   refetchData();
 * });
 */
export function useStaffNotifications(role, onNotification) {
  const channelMap = {
    RECEPTIONIST: CHANNELS.NOTIFICATIONS_RECEPTIONIST,
    CASHIER: CHANNELS.NOTIFICATIONS_CASHIER,
    SUPERADMIN: CHANNELS.NOTIFICATIONS_SUPERADMIN,
    SUPER_ADMIN: CHANNELS.NOTIFICATIONS_SUPERADMIN,
  };

  const channel = channelMap[role?.toUpperCase()];

  return usePusher(channel, {
    [EVENTS.NEW_NOTIFICATION]: onNotification,
  }, !!channel);
}

/**
 * Hook for booking updates (for staff dashboards)
 * 
 * @param {object} handlers - Object with event handlers
 * 
 * @example
 * useBookingUpdates({
 *   onBookingCreated: (data) => refetchBookings(),
 *   onBookingUpdated: (data) => updateBooking(data),
 *   onBookingCancelled: (data) => removeBooking(data.bookingId),
 *   onPaymentReceived: (data) => refetchBookings(),
 * });
 */
export function useBookingUpdates({
  onBookingCreated,
  onBookingUpdated,
  onBookingCancelled,
  onCheckedIn,
  onCheckedOut,
  onPaymentReceived,
} = {}) {
  const eventHandlers = {};

  if (onBookingCreated) eventHandlers[EVENTS.BOOKING_CREATED] = onBookingCreated;
  if (onBookingUpdated) eventHandlers[EVENTS.BOOKING_UPDATED] = onBookingUpdated;
  if (onBookingCancelled) eventHandlers[EVENTS.BOOKING_CANCELLED] = onBookingCancelled;
  if (onCheckedIn) eventHandlers[EVENTS.BOOKING_CHECKED_IN] = onCheckedIn;
  if (onCheckedOut) eventHandlers[EVENTS.BOOKING_CHECKED_OUT] = onCheckedOut;
  if (onPaymentReceived) eventHandlers[EVENTS.PAYMENT_RECEIVED] = onPaymentReceived;

  return usePusher(CHANNELS.BOOKINGS, eventHandlers);
}

/**
 * Hook for room availability updates (for booking pages)
 * 
 * @param {function} onAvailabilityChange - Callback when availability changes
 * @param {function} onRoomBooked - Callback when a room is booked
 * 
 * @example
 * useAvailabilityUpdates({
 *   onAvailabilityChange: () => refetchAvailability(),
 *   onRoomBooked: (data) => {
 *     showToast('A room was just booked, updating availability...');
 *     refetchAvailability();
 *   }
 * });
 */
export function useAvailabilityUpdates({ onAvailabilityChange, onRoomBooked } = {}) {
  const eventHandlers = {};

  if (onAvailabilityChange) eventHandlers[EVENTS.AVAILABILITY_CHANGED] = onAvailabilityChange;
  if (onRoomBooked) eventHandlers[EVENTS.ROOM_BOOKED] = onRoomBooked;

  return usePusher(CHANNELS.AVAILABILITY, eventHandlers);
}

/**
 * Hook for user-specific updates (for guest dashboard)
 * 
 * @param {string|number} userId - The user's ID
 * @param {function} onBookingStatusChanged - Callback when booking status changes
 * 
 * @example
 * useUserUpdates(session.user.id, {
 *   onBookingStatusChanged: (data) => {
 *     showToast(`Your booking status changed to: ${data.status}`);
 *     refetchBookings();
 *   }
 * });
 */
export function useUserUpdates(userId, { onBookingStatusChanged, onNotification } = {}) {
  const channel = userId ? `${CHANNELS.USER_PREFIX}${userId}` : null;
  
  const eventHandlers = {};
  if (onBookingStatusChanged) eventHandlers[EVENTS.BOOKING_STATUS_CHANGED] = onBookingStatusChanged;
  if (onNotification) eventHandlers[EVENTS.NEW_NOTIFICATION] = onNotification;

  return usePusher(channel, eventHandlers, !!userId);
}

/**
 * Hook for payment updates (for cashier dashboard)
 * 
 * @param {object} handlers - Object with event handlers
 */
export function usePaymentUpdates({ onPaymentReceived, onPaymentVerified, onPaymentFlagged } = {}) {
  const eventHandlers = {};

  if (onPaymentReceived) eventHandlers[EVENTS.PAYMENT_RECEIVED] = onPaymentReceived;
  if (onPaymentVerified) eventHandlers[EVENTS.PAYMENT_VERIFIED] = onPaymentVerified;
  if (onPaymentFlagged) eventHandlers[EVENTS.PAYMENT_FLAGGED] = onPaymentFlagged;

  return usePusher(CHANNELS.BOOKINGS, eventHandlers);
}

// Re-export constants for convenience
export { CHANNELS, EVENTS };
