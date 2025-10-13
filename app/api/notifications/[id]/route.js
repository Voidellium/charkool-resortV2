// app/api/notifications/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH Notification Error:", err);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
