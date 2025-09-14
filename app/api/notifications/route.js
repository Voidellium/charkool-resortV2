// app/api/notifications/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ GET: Fetch notifications by role
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role"); // "admin" or "superadmin"

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const notifications = await prisma.notification.findMany({
      where: { role },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET Notifications Error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// ✅ POST: Create a new notification
export async function POST(req) {
  try {
    const body = await req.json();
    const { message, type, role } = body;

    if (!message || !type || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newNotification = await prisma.notification.create({
      data: { message, type, role },
    });

    return NextResponse.json(newNotification);
  } catch (error) {
    console.error("POST Notification Error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}