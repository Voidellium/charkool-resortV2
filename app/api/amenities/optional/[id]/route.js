import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
const isAuthorized = (role) => role === 'SUPERADMIN' || role === 'AMENITYINVENTORYMANAGER';

export async function PUT(request, { params }) {
  const token = await getToken({ req: request, secret: JWT_SECRET });
  if (!token || !isAuthorized(token.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const data = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.maxQuantity !== undefined) data.maxQuantity = Math.max(1, parseInt(body.maxQuantity) || 1);
    if (body.quantity !== undefined) data.quantity = Math.max(0, parseInt(body.quantity) || 0);

    const updated = await prisma.optionalAmenity.update({ where: { id }, data });

    await prisma.amenityLog.create({ data: { action: 'UPDATE', amenityName: updated.name, user: token.name || 'Unknown User' } });
    try {
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'UPDATE',
        entity: 'OptionalAmenity',
        entityId: String(updated.id),
        details: `Updated optional amenity "${updated.name}"`,
      });
    } catch {}
    return NextResponse.json(updated);
  } catch (error) {
    console.error('❌ Optional Amenity PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const token = await getToken({ req: request, secret: JWT_SECRET });
  if (!token || !isAuthorized(token.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const id = parseInt(params.id);
    const deleted = await prisma.optionalAmenity.delete({ where: { id } });
    await prisma.amenityLog.create({ data: { action: 'DELETE', amenityName: deleted.name, user: token.name || 'Unknown User' } });
    try {
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'DELETE',
        entity: 'OptionalAmenity',
        entityId: String(deleted.id),
        details: `Deleted optional amenity "${deleted.name}"`,
      });
    } catch {}
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Optional Amenity DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
