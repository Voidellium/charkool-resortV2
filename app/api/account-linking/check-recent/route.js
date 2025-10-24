import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Check for any pending Google account linking (for current session)
export async function GET(req) {
  try {
    // Find users with pending Google link
    const usersWithPending = await prisma.user.findMany({
      where: {
        pendingGoogleLink: {
          not: null
        }
      },
      select: {
        email: true,
        pendingGoogleLink: true
      },
      take: 10 // Get last 10 pending links
    });

    if (usersWithPending.length > 0) {
      // Find the most recent one within last 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      for (const user of usersWithPending) {
        try {
          const googleData = JSON.parse(user.pendingGoogleLink);
          const pendingTimestamp = new Date(googleData.timestamp).getTime();
          
          // Check if this pending link was created recently
          if (pendingTimestamp > fiveMinutesAgo) {
            return NextResponse.json({
              hasPending: true,
              email: user.email,
              googleData
            });
          }
        } catch (parseError) {
          console.error('Error parsing pending link data:', parseError);
          continue;
        }
      }
    }

    return NextResponse.json({ hasPending: false });
  } catch (error) {
    console.error('Error checking for recent pending link:', error);
    return NextResponse.json({ error: 'Failed to check pending link' }, { status: 500 });
  }
}
