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
        // Don't update email as it should remain the same
        // Don't update sensitive data like password, contact, etc.
      };
    }
    // If selectedData === 'existing', we don't update any user data

    // Update user if Google data was selected
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
    }

    // Create the Google account link
    // Note: We don't create the Account record here because NextAuth will handle it
    // We just need to store the googleId for reference
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: googleData.sub || googleData.id, // Google user ID
      }
    });

    return NextResponse.json({
      message: 'Accounts linked successfully',
      user: {
        id: user.id,
        email: user.email,
        name: selectedData === 'google' ? googleData.name : user.name,
        image: selectedData === 'google' ? googleData.image : user.image
      }
    });

  } catch (error) {
    console.error('Account linking completion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}