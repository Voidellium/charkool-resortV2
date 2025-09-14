import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const ALLOWED_ORIGIN = 'http://localhost:3001';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Preflight handler
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// GET all users
export async function GET(req) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    });
    return new Response(JSON.stringify(users), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

// POST create new user
export async function POST(req) {
  try {
    const { name, email, password, role } = await req.json();

    // Lowercase email for consistency
    const lowercasedEmail = email.toLowerCase().trim();

    // Check if user already exists (using lowercased email)
    const existingUser = await prisma.user.findUnique({ where: { email: lowercasedEmail } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 400, headers: corsHeaders });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10); // hash password
    const newUser = await prisma.user.create({
      data: { name, email: lowercasedEmail, password: hashedPassword, role },
      select: { id: true, name: true, email: true, role: true },
    });
    return new Response(JSON.stringify(newUser), { status: 201, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
