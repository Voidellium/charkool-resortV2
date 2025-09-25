import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// GET: fetch logged-in guest info and bookings
export const GET = async (req) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guest = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!guest) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: session.user.id },
      include: { room: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ guest, bookings });
  } catch (error) {
    console.error('❌ Guest Me GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// PUT /api/guest/me - Update current user's profile
export async function PUT(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { firstName, lastName, contactNumber, birthdate } = await request.json();

    if (!firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'First and last name are required.' }), { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        contactNumber,
        birthdate: birthdate ? new Date(birthdate) : null,
      },
    });

    const { password, ...userToReturn } = updatedUser;
    return new Response(JSON.stringify(userToReturn), { status: 200 });
  } catch (error) {
    console.error('Failed to update profile:', error);
    if (error.code === 'P2002') {
      return new Response(JSON.stringify({ error: 'A user with this information already exists.' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: 'An error occurred while updating your profile.' }), { status: 500 });
  }
}
