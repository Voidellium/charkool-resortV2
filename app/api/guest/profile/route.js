import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// GET: fetch logged-in guest profile
export const GET = async (req) => {
  try {
    const token = await getToken({ req, secret: JWT_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(token.sub);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('❌ Guest Profile GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// PUT: update logged-in guest profile
export const PUT = async (req) => {
  try {
    const token = await getToken({ req, secret: JWT_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(token.sub);

    const body = await req.json();
    const { name, email, password } = body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase().trim();
    if (password) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('❌ Guest Profile PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
