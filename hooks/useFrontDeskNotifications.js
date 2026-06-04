'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPusherClient, CHANNELS, EVENTS } from '@/lib/pusher-client';

function mergeById(existing, incoming) {
  const map = new Map();
  for (const n of existing) {
    if (n?.id != null) map.set(String(n.id), n);
  }
  for (const n of incoming) {
    if (n?.id != null) map.set(String(n.id), n);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
}

/**
 * Subscribe to cashier + receptionist Pusher notification channels (deduped by id).
 */
export function useFrontDeskNotifications(onNotification) {
  const [notifications, setNotifications] = useState([]);
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  const handleNew = useCallback((notification) => {
    if (!notification) return;
    setNotifications((prev) => {
      const id = notification.id != null ? String(notification.id) : null;
      if (id) {
        const exists = prev.some((n) => String(n.id) === id);
        if (exists) return prev;
      }
      return [notification, ...prev];
    });
    handlerRef.current?.(notification);
  }, []);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return undefined;

    const channels = [
      CHANNELS.NOTIFICATIONS_CASHIER,
      CHANNELS.NOTIFICATIONS_RECEPTIONIST,
    ].filter(Boolean);

    const subs = channels.map((name) => {
      const ch = pusher.subscribe(name);
      ch.bind(EVENTS.NEW_NOTIFICATION, handleNew);
      return { name, ch };
    });

    return () => {
      subs.forEach(({ name, ch }) => {
        ch.unbind(EVENTS.NEW_NOTIFICATION, handleNew);
        pusher.unsubscribe(name);
      });
    };
  }, [handleNew]);

  const prependFetched = useCallback((items) => {
    if (!Array.isArray(items)) return;
    setNotifications((prev) => mergeById(items, prev));
  }, []);

  return { notifications, setNotifications, prependFetched };
}
