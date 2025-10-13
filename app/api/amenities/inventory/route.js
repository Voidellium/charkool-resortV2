import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// ✅ GET all amenity inventory items
export async function GET() {
  try {
    // Fetch all amenity inventory items - simple stock display
    const amenityInventory = await prisma.amenityInventory.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(amenityInventory);
  } catch (error) {
    console.error('GET amenities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amenities.' },
      { status: 500 }
    );
  }
}

// ✅ POST — Add a new amenity inventory item
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    if (!body.name || body.quantity == null) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const created = await prisma.amenityInventory.create({
      data: {
        name: body.name.trim(),
        category: body.category || 'General',
        quantity: parseInt(body.quantity, 10),
      },
    });

    // Record audit trail with human-readable message
    try {
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || 'System',
        actorRole: session?.user?.role || 'ADMIN',
        action: 'CREATE',
        entity: 'Amenity Inventory',
        entityId: created.id.toString(),
        details: `Added new amenity "${created.name}" with ${created.quantity} items in stock (Category: ${created.category || 'General'})`
      });
    } catch (auditError) {
      console.error('Failed to record audit trail for amenity creation:', auditError);
    }

    // Create notification for superadmin
    try {
      await prisma.notification.create({
        data: {
          message: `New amenity added: ${created.name} (Stock: ${created.quantity})`,
          type: 'amenity_added',
          role: 'superadmin',
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error('POST amenities error:', error);
    return NextResponse.json(
      { error: 'Failed to add inventory.' },
      { status: 500 }
    );
  }
}
