import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Store pending Google account linking data
export async function POST(req) {
  try {
    const { email, googleData } = await req.json();

    if (!email || !googleData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Store or update pending account linking data
    // Using a simple JSON storage in database or you can use a dedicated table
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        // Store the pending linking data in a JSON field or use a dedicated table
        // For now, we'll use a custom field (you may need to add this to schema)
        pendingGoogleLink: JSON.stringify({
          googleId: googleData.id || googleData.sub,
          name: googleData.name,
          email: googleData.email,
          image: googleData.image,
          timestamp: new Date().toISOString()
        })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing pending account link:', error);
    return NextResponse.json({ error: 'Failed to store pending link' }, { status: 500 });
  }
}

// Get pending Google account linking data
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        email: true,
        pendingGoogleLink: true
      }
    });

    if (!user || !user.pendingGoogleLink) {
      return NextResponse.json({ hasPending: false });
    }

    const googleData = JSON.parse(user.pendingGoogleLink);
    
    // Clear the pending data after retrieval
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { pendingGoogleLink: null }
    });

    return NextResponse.json({
      hasPending: true,
      email: user.email,
      googleData
    });
  } catch (error) {
    console.error('Error retrieving pending account link:', error);
    return NextResponse.json({ error: 'Failed to retrieve pending link' }, { status: 500 });
  }
}
