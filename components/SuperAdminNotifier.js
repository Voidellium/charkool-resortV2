'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffNotifications } from '@/hooks/usePusher';
import { useToast } from '@/components/Toast';

export default function SuperAdminNotifier() {
  const Toast = useToast();
  const router = useRouter();

  useStaffNotifications('SUPERADMIN', (data) => {
    // Data comes from server via notifyStaff -> NEW_NOTIFICATION
    if (!data) return;

    const title = data.message || 'Notification';

    // Build an onClick that navigates to the right place and marks the notification read
    const onClick = async () => {
      try {
        // Prefer escalationId for chat escalations
        if (data.escalationId) {
          router.push(`/super-admin/escalations?highlight=${data.escalationId}`);
        } else if (data.bookingId) {
          router.push(`/super-admin/bookings/${data.bookingId}`);
        } else if (data.id) {
          // fallback: open notifications list
          router.push('/super-admin/notifications');
        }

        // Mark notification as read if we have its id
        if (data.id) {
          try {
            await fetch(`/api/notifications/${data.id}`, { method: 'PATCH' });
          } catch (err) {
            // non-fatal
            console.error('Failed to mark notification read:', err);
          }
        }
      } catch (err) {
        console.error('Notification click handler failed:', err);
      }
    };

    // If this is an escalation event, surface it prominently with an actionable toast
    if (data.event === 'CHAT_ESCALATION_REQUEST') {
      Toast.addToast({
        title: 'Escalation Request',
        message: `${data.guestName || data.guestEmail} requested direct contact`,
        onClick,
      });
    } else {
      Toast.addToast({ title: 'Notification', message: title, onClick });
    }
  });

  return null;
}
