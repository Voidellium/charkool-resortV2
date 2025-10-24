import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { email, selectedData, existingUser, googleData } = await req.json();

    if (!email || !selectedData || !existingUser || !googleData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Get the existing user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        accounts: {
          where: { provider: 'google' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if Google account is already linked
    if (user.accounts.length > 0) {
      return NextResponse.json({ error: 'Google account already linked' }, { status: 400 });
    }

    let updateData = {};

    // Update user data based on selection
    if (selectedData === 'google') {
      updateData = {
        name: googleData.name,
        image: googleData.image,
        googleId: googleData.sub || googleData.id,
        pendingGoogleLink: null // Clear pending data
      };
    } else {
      // Just clear pending data and set googleId
      updateData = {
        googleId: googleData.sub || googleData.id,
        pendingGoogleLink: null // Clear pending data
      };
    }

    // Update user with selected data
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    // Create the Google Account record for NextAuth
    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: googleData.sub || googleData.id,
        // You may need to store additional tokens if available
        // access_token: googleData.access_token,
        // refresh_token: googleData.refresh_token,
        // expires_at: googleData.expires_at,
      }
    });

    return NextResponse.json({
      message: 'Accounts linked successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image
      }
    });

  } catch (error) {
    console.error('Account linking completion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}