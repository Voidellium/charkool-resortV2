import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

// GET all users
export async function GET(req) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, middleName: true, lastName: true, birthdate: true, contactNumber: true, name: true, email: true, role: true },
    });
    return new Response(JSON.stringify(users), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// POST create new user
export async function POST(req) {
  try {
    const { firstName, middleName, lastName, birthdate, contactNumber, name, email, password, role } = await req.json();

    // Lowercase email for consistency
    const lowercasedEmail = email.toLowerCase().trim();

    // Check if user already exists (using lowercased email)
    const existingUser = await prisma.user.findUnique({ where: { email: lowercasedEmail } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10); // hash password
    const newUser = await prisma.user.create({
      data: { firstName, middleName, lastName, birthdate: new Date(birthdate), contactNumber, name, email: lowercasedEmail, password: hashedPassword, role },
      select: { id: true, firstName: true, middleName: true, lastName: true, birthdate: true, contactNumber: true, name: true, email: true, role: true },
    });
    return new Response(JSON.stringify(newUser), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// PUT update user profile
export async function PUT(req) {
  try {
    const { firstName, middleName, lastName, birthdate, contactNumber, email, preferences } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        firstName,
        middleName,
        lastName,
        birthdate: new Date(birthdate),
        contactNumber,
        preferences,
      },
      select: { id: true, firstName: true, middleName: true, lastName: true, birthdate: true, contactNumber: true, name: true, email: true, preferences: true },
    });

    return new Response(JSON.stringify(updatedUser), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
