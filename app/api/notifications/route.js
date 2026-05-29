// app/api/notifications/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { notifyStaff, notifyUser, EVENTS } from '@/lib/pusher-server';

// ✅ GET: Fetch notifications by role or userId
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const role = url.searchParams.get("role"); // "admin", "superadmin", or "customer"
    const userId = url.searchParams.get("userId");

    let whereClause = {};
    
    if (userId) {
      whereClause.userId = parseInt(userId);
    } else if (role) {
      // Handle customer role specifically
      if (role.toUpperCase() === 'CUSTOMER') {
        if (session?.user?.id) {
          whereClause.userId = parseInt(session.user.id);
        } else {
          // If no session, return empty array instead of error
          return NextResponse.json([]);
        }
      } else {
        // Case-insensitive role match for admin/superadmin
        whereClause.role = { equals: role, mode: 'insensitive' };
      }
    } else {
      return NextResponse.json({ error: "Role or userId is required" }, { status: 400 });
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50, // Increased limit for better user experience
    });

    return NextResponse.json(notifications || []);
  } catch (error) {
    console.error("GET Notifications Error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// ✅ POST: Create a new notification
export async function POST(req) {
  try {
    const body = await req.json();
    const { message, type, role, bookingId, userId, targetRoles } = body;

    if (!message || !type || (!role && (!Array.isArray(targetRoles) || targetRoles.length === 0))) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const rolesToCreate = Array.isArray(targetRoles) && targetRoles.length > 0
      ? targetRoles
      : [role];

    const createdNotifications = [];
    for (const targetRole of rolesToCreate) {
      const created = await prisma.notification.create({
        data: {
          message,
          type,
          role: String(targetRole).toUpperCase(),
          bookingId: bookingId ? Number(bookingId) : null,
          userId: userId ? Number(userId) : null,
        },
      });
      createdNotifications.push(created);
    }

    const primaryNotification = createdNotifications[0];

    // 🔔 PUSHER: Send real-time notification to the appropriate channel
    try {
      if (rolesToCreate.length === 1 && String(rolesToCreate[0]).toUpperCase() === 'CUSTOMER' && userId) {
        // Notify specific user
        await notifyUser(userId, EVENTS.NEW_NOTIFICATION, {
          id: primaryNotification.id,
          message,
          type,
          bookingId: primaryNotification.bookingId,
          createdAt: primaryNotification.createdAt,
        });
      } else {
        // Notify staff by role(s)
        for (const n of createdNotifications) {
          await notifyStaff(n.role, {
            id: n.id,
            message: n.message,
            type: n.type,
            bookingId: n.bookingId,
            createdAt: n.createdAt,
          });
        }
      }
      console.log('[Pusher] Sent real-time notification');
    } catch (pusherErr) {
      console.error('[Pusher] Failed to send real-time notification:', pusherErr);
      // Non-critical: notification was still saved to database
    }

    // Record audit for notification creation
    try {
      const session = await getServerSession(authOptions);
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'System',
        actorRole: session?.user?.role || 'SYSTEM',
        action: 'CREATE',
        entity: 'Notification',
        entityId: String(primaryNotification.id),
        details: JSON.stringify({
          summary: `Created notification: ${message.substring(0, 50)}...`,
          after: primaryNotification,
          count: createdNotifications.length,
          targetRoles: rolesToCreate,
        }),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for notification creation:', auditErr);
    }

    return NextResponse.json(
      createdNotifications.length === 1
        ? primaryNotification
        : { success: true, count: createdNotifications.length, notifications: createdNotifications }
    );
  } catch (error) {
    console.error("POST Notification Error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}