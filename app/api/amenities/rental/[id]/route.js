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
    if (body.pricePerUnit !== undefined) data.pricePerUnit = Math.max(0, parseInt(body.pricePerUnit) || 0);
    if (body.pricePerHour !== undefined) data.pricePerHour = body.pricePerHour != null ? Math.max(0, parseInt(body.pricePerHour) || 0) : null;
    if (body.unitType !== undefined) data.unitType = body.unitType.trim();
    if (body.unitNote !== undefined) data.unitNote = body.unitNote?.trim() || null;
    if (body.quantity !== undefined) data.quantity = Math.max(0, parseInt(body.quantity) || 0);

    const updated = await prisma.rentalAmenity.update({ where: { id }, data });
    await prisma.amenityLog.create({ data: { action: 'UPDATE', amenityName: updated.name, user: token.name || 'Unknown User' } });
    try {
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'UPDATE',
        entity: 'RentalAmenity',
        entityId: String(updated.id),
        details: `Updated rental amenity "${updated.name}"`,
      });
    } catch {}
    return NextResponse.json(updated);
  } catch (error) {
    console.error('❌ Rental Amenity PUT Error:', error);
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
    const deleted = await prisma.rentalAmenity.delete({ where: { id } });
    await prisma.amenityLog.create({ data: { action: 'DELETE', amenityName: deleted.name, user: token.name || 'Unknown User' } });
    try {
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'ADMIN',
        action: 'DELETE',
        entity: 'RentalAmenity',
        entityId: String(deleted.id),
        details: `Deleted rental amenity "${deleted.name}"`,
      });
    } catch {}
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Rental Amenity DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
