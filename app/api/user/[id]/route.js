import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const ALLOWED_ORIGIN = 'http://localhost:3001';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Preflight handler
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// GET single user by ID
export async function GET(req, { params }) {
  try {
    const id = parseInt(params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
    return new Response(JSON.stringify(user), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

// PUT update user
export async function PUT(req, { params }) {
  try {
    const id = parseInt(params.id);
    const { name, email, password, role } = await req.json();

    // Validate role against enum
    const validRoles = ['SUPERADMIN', 'RECEPTIONIST', 'AMENITYINVENTORYMANAGER', 'MANAGER', 'CASHIER', 'CUSTOMER'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: corsHeaders });
    }

    let updatedData = { name, email, role };
    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatedData,
      select: { id: true, name: true, email: true, role: true },
    });

    return new Response(JSON.stringify(updatedUser), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

// DELETE user
export async function DELETE(req, { params }) {
  try {
    const id = parseInt(params.id);
    await prisma.user.delete({ where: { id } });
    return new Response(JSON.stringify({ message: 'User deleted successfully' }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
