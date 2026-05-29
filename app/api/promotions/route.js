import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getToken } from 'next-auth/jwt';
import { put } from '@vercel/blob';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// Helper function to serialize BigInt values
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export async function GET() {
  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(serializeBigInt(promotions));
  } catch (error) {
    console.error('Fetch Promotions Error:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title');
    const description = formData.get('description');
    const discountType = formData.get('discountType');
    const discountValue = parseInt(formData.get('discountValue'));
    const targetType = formData.get('targetType');
    const isActive = formData.get('isActive') === 'true';
    const startDate = new Date(formData.get('startDate'));
    const endDate = new Date(formData.get('endDate'));
    const imageFile = formData.get('image');

    if (!title || !discountType || !discountValue || !targetType || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let imagePath = null;
    if (imageFile && imageFile.size > 0) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(imageFile.type)) {
        return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, GIF allowed.' }, { status: 400 });
      }
      if (imageFile.size > 5 * 1024 * 1024) { // 5MB limit
        return NextResponse.json({ error: 'File size too large. Max 5MB.' }, { status: 400 });
      }

      const bytes = await imageFile.arrayBuffer();
      const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blob = await put(`promotions/${Date.now()}-${safeName}`, Buffer.from(bytes), {
        access: 'public',
        contentType: imageFile.type,
      });
      imagePath = blob.url;
    }

    const promotion = await prisma.promotion.create({
      data: {
        title,
        description,
        image: imagePath,
        discountType,
        discountValue,
        targetType,
        isActive,
        startDate,
        endDate,
      },
    });

    // Record audit for creation (and publish if active)
    try {
      const token = await getToken({ req: request, secret: JWT_SECRET });
      await recordAudit({
        actorId: token?.sub ? parseInt(token.sub) : null,
        actorName: token?.name || token?.email || 'Unknown',
        actorRole: token?.role || 'SUPERADMIN',
        action: 'CREATE',
        entity: 'Promotion',
        entityId: String(promotion.id),
        details: `Created promotion "${promotion.title}"`,
      });

      if (promotion.isActive) {
        await recordAudit({
          actorId: token?.sub ? parseInt(token.sub) : null,
          actorName: token?.name || token?.email || 'Unknown',
          actorRole: token?.role || 'SUPERADMIN',
          action: 'PUBLISH',
          entity: 'Promotion',
          entityId: String(promotion.id),
          details: `Published promotion "${promotion.title}"`,
        });
      }
    } catch (auditErr) {
      console.error('Failed to record audit for promotion create/publish', auditErr);
    }

    return NextResponse.json(serializeBigInt(promotion), { status: 201 });
  } catch (error) {
    console.error('Create Promotion Error:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}
