import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// ✅ PUT — Update an amenity
export async function PUT(req, { params }) {
  const data = await req.json();
  const updated = await prisma.amenity.update({
    where: { id: parseInt(params.id, 10) },
    data,
  });

  try {
    const token = await getToken({ req, secret: JWT_SECRET });
    await recordAudit({
      actorId: token?.sub ? parseInt(token.sub) : null,
      actorName: token?.name || token?.email || 'Unknown',
      actorRole: token?.role || 'ADMIN',
      action: 'UPDATE',
      entity: 'Amenity',
      entityId: String(updated.id),
      details: `Updated amenity "${updated.name || updated.id}"`,
    });
  } catch (auditErr) {
    console.error('Amenity update audit error', auditErr);
  }
  return NextResponse.json(updated);
}

// ✅ DELETE — Remove an amenity
export async function DELETE(_, { params }) {
  await prisma.amenity.delete({ where: { id: parseInt(params.id, 10) } });

  try {
    // Note: we don't have the token here; record a best-effort log
    await recordAudit({
      actorId: null,
      actorName: 'Unknown',
      actorRole: 'ADMIN',
      action: 'DELETE',
      entity: 'Amenity',
      entityId: String(params.id),
      details: `Deleted amenity id ${params.id}`,
    });
  } catch (auditErr) {
    console.error('Amenity delete audit error', auditErr);
  }
  return NextResponse.json({ message: 'Deleted successfully' });
}
