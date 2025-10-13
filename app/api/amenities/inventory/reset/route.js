import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// POST: Reset amenity inventory to the 6 required items only
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only super admin can reset the inventory
    if (!session || session.user?.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only Super Admin can reset inventory.' },
        { status: 403 }
      );
    }

    const requiredAmenities = [
      { name: 'Broom & Dustpan', quantity: 48, category: 'Cleaning Supplies' },
      { name: 'Extra Bed', quantity: 48, category: 'Furniture' },
      { name: 'Extra Blanket', quantity: 48, category: 'Bedding' },
      { name: 'Extra Pillow', quantity: 50, category: 'Bedding' },
      { name: 'Toiletries Kit', quantity: 47, category: 'Bathroom Essentials' },
      { name: 'Towels Set', quantity: 49, category: 'Bathroom Essentials' },
    ];

    // Delete all existing amenities
    const deleteResult = await prisma.amenityInventory.deleteMany({});
    
    // Create the required amenities
    const createdAmenities = await Promise.all(
      requiredAmenities.map(amenity => 
        prisma.amenityInventory.create({
          data: amenity
        })
      )
    );

    // Record audit trail
    await recordAudit({
      actorId: session.user.id,
      actorName: session.user.name || 'Super Admin',
      actorRole: session.user.role,
      action: 'RESET',
      entity: 'Amenity Inventory',
      entityId: 'ALL',
      details: `Reset amenity inventory - Deleted ${deleteResult.count} items and created 6 required amenities: ${requiredAmenities.map(a => a.name).join(', ')}`
    });

    // Create notification
    await prisma.notification.create({
      data: {
        message: `Amenity inventory has been reset to the 6 required items by ${session.user.name}`,
        type: 'amenity_reset',
        role: 'superadmin',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Amenity inventory has been reset successfully',
      deleted: deleteResult.count,
      created: createdAmenities.length,
      amenities: createdAmenities
    });

  } catch (error) {
    console.error('Error resetting amenity inventory:', error);
    return NextResponse.json(
      { error: 'Failed to reset amenity inventory' },
      { status: 500 }
    );
  }
}