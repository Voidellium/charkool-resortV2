// app/api/register/route.js
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import bcrypt from 'bcrypt';

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Lowercase email for consistency
    const lowercasedEmail = email.toLowerCase().trim();  // Also trim any whitespace

    // Check if user already exists (using lowercased email)
    const existingUser = await prisma.user.findUnique({ where: { email: lowercasedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);  // Trim password too, for good measure

    // Create user with lowercased email
    const newUser = await prisma.user.create({
      data: {
        name,
        email: lowercasedEmail,  // Store as lowercase
        password: hashedPassword,
      },
    });

    // Add logging to confirm
    console.log('✅ New user created:', { id: newUser.id, email: newUser.email });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: String(newUser.id),
          name: newUser.name,
          email: newUser.email,  // This will be lowercased
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('❌ Registration Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}