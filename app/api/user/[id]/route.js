import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
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

    // Get user data before update for audit trail
    const beforeUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

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

    // Record audit for user update
    try {
      const session = await getServerSession(authOptions);
      const changes = [];
      if (beforeUser.name !== updatedUser.name) changes.push(`name: "${beforeUser.name}" → "${updatedUser.name}"`);
      if (beforeUser.email !== updatedUser.email) changes.push(`email: "${beforeUser.email}" → "${updatedUser.email}"`);
      if (beforeUser.role !== updatedUser.role) changes.push(`role: "${beforeUser.role}" → "${updatedUser.role}"`);
      if (password) changes.push('password: [updated]');

      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'Unknown',
        actorRole: session?.user?.role || 'ADMIN',
        action: 'UPDATE',
        entity: 'User',
        entityId: String(updatedUser.id),
        details: JSON.stringify({
          summary: `Updated user ${updatedUser.name}: ${changes.join(', ')}`,
          before: beforeUser,
          after: { ...updatedUser, passwordChanged: !!password }
        }),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for user update:', auditErr);
    }

    return new Response(JSON.stringify(updatedUser), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

// DELETE user
export async function DELETE(req, { params }) {
  try {
    const id = parseInt(params.id);
    
    // Get user data before deletion for audit trail
    const beforeUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    await prisma.user.delete({ where: { id } });

    // Record audit for user deletion
    try {
      const session = await getServerSession(authOptions);
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'Unknown',
        actorRole: session?.user?.role || 'ADMIN',
        action: 'DELETE',
        entity: 'User',
        entityId: String(id),
        details: JSON.stringify({
          summary: `Deleted user ${beforeUser?.name || beforeUser?.email || id}`,
          before: beforeUser
        }),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for user deletion:', auditErr);
    }

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
