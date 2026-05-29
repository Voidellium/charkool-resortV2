import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { handleUpload } from '@vercel/blob/client';
import { authOptions } from '@/app/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/pjpeg', 'image/png'],
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({
          userId: session.user.id,
          role: session.user.role,
          purpose: 'room-image',
        }),
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('Room image upload completed', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Room upload token generation failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to prepare room image upload' },
      { status: 400 }
    );
  }
}