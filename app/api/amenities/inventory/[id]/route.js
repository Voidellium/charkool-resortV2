import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// ✅ PUT — Update an amenity
export async function PUT(req, { params }) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    const data = await req.json();
    
    // Validate input data
    if (!data.name || data.name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const quantity = Number(data.quantity);
    if (isNaN(quantity) || quantity < 0) {
      return NextResponse.json({ error: 'Quantity must be a non-negative number' }, { status: 400 });
    }
    
    // Get the existing amenity for audit log
    const existing = await prisma.amenityInventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Amenity not found' }, { status: 404 });
    }
    
    const updated = await prisma.amenityInventory.update({
      where: { id },
      data: { 
        name: data.name.trim(), 
        quantity: quantity,
        category: data.category || 'General',
      },
    });

    // Record audit trail
    try {
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || 'System',
        actorRole: session?.user?.role || 'ADMIN',
        action: 'UPDATE',
        entity: 'Amenity Inventory',
        entityId: id.toString(),
        details: `Updated amenity "${existing.name}"${existing.name !== updated.name ? ` (renamed to "${updated.name}")` : ''}${existing.quantity !== updated.quantity ? ` - Stock changed from ${existing.quantity} to ${updated.quantity}` : ''}${existing.category !== updated.category ? ` - Category changed from "${existing.category}" to "${updated.category}"` : ''}`
      });
    } catch (auditError) {
      console.error('Failed to record audit trail for amenity update:', auditError);
    }

    // Create notification for superadmin
    try {
      await prisma.notification.create({
        data: {
          message: `Amenity updated: ${updated.name} (New Stock: ${updated.quantity})`,
          type: 'amenity_updated',
          role: 'superadmin',
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }
}

// ✅ DELETE — Remove an amenity
export async function DELETE(req, { params }) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    const existing = await prisma.amenityInventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Amenity not found' }, { status: 404 });
    }

    const deleted = await prisma.amenityInventory.delete({ where: { id } });

    // Record audit trail
    try {
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || 'System',
        actorRole: session?.user?.role || 'ADMIN',
        action: 'DELETE',
        entity: 'Amenity Inventory', 
        entityId: id.toString(),
        details: `Deleted amenity "${existing.name}" (${existing.quantity} items in stock, Category: ${existing.category || 'General'})`
      });
    } catch (auditError) {
      console.error('Failed to record audit trail for amenity deletion:', auditError);
    }

    return NextResponse.json(deleted);
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
}
