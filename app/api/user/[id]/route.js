import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { STAFF_ROLES, isStaffRole, isCustomerRole, validateRoleTransition } from '@/lib/roles';

const prisma = new PrismaClient();

const corsHeaders = {
  'Content-Type': 'application/json',
};

// GET single user by ID
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, lastLogin: true },
    });
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
    }
    return new Response(JSON.stringify(user), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

// PUT update user (with role boundary enforcement)
export async function PUT(req, { params }) {
  try {
    // Require authenticated SuperAdmin session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    
    if (session.user.role !== 'SUPERADMIN') {
      return new Response(JSON.stringify({ error: 'Only Super Admin can modify users' }), { status: 403, headers: corsHeaders });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const { name, email, password, role } = await req.json();

    // Get current user data
    const beforeUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!beforeUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
    }

    // Validate role transition (enforce customer/staff separation)
    if (role && role !== beforeUser.role) {
      const transition = validateRoleTransition(beforeUser.role, role);
      if (!transition.valid) {
        return new Response(JSON.stringify({ error: transition.error }), { status: 400, headers: corsHeaders });
      }
    }

    // If editing staff, ensure new role is also staff
    if (isStaffRole(beforeUser.role) && role && !isStaffRole(role)) {
      return new Response(JSON.stringify({ 
        error: 'Staff accounts can only be assigned staff roles' 
      }), { status: 400, headers: corsHeaders });
    }

    // If editing customer, role cannot be changed
    if (isCustomerRole(beforeUser.role) && role && role !== beforeUser.role) {
      return new Response(JSON.stringify({ 
        error: 'Customer role cannot be changed. They must register as a new account.' 
      }), { status: 400, headers: corsHeaders });
    }

    // Build update data
    let updatedData = {};
    if (name) updatedData.name = name.trim();
    if (email) updatedData.email = email.toLowerCase().trim();
    if (role && isStaffRole(beforeUser.role)) updatedData.role = role;
    if (password) {
      if (password.length < 8) {
        return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400, headers: corsHeaders });
      }
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData,
      select: { id: true, name: true, email: true, role: true },
    });

    // Record audit
    try {
      const changes = [];
      if (beforeUser.name !== updatedUser.name) changes.push(`name: "${beforeUser.name}" → "${updatedUser.name}"`);
      if (beforeUser.email !== updatedUser.email) changes.push(`email: "${beforeUser.email}" → "${updatedUser.email}"`);
      if (beforeUser.role !== updatedUser.role) changes.push(`role: "${beforeUser.role}" → "${updatedUser.role}"`);
      if (password) changes.push('password: [updated]');

      await recordAudit({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email,
        actorRole: session.user.role,
        action: 'UPDATE',
        entity: isStaffRole(updatedUser.role) ? 'Staff' : 'User',
        entityId: String(updatedUser.id),
        details: JSON.stringify({
          summary: `Updated ${isStaffRole(updatedUser.role) ? 'staff' : 'user'} ${updatedUser.name}: ${changes.join(', ')}`,
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
    // Require authenticated SuperAdmin session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    
    if (session.user.role !== 'SUPERADMIN') {
      return new Response(JSON.stringify({ error: 'Only Super Admin can delete users' }), { status: 403, headers: corsHeaders });
    }

    const { id } = await params;
    const userId = parseInt(id);

    // Prevent self-deletion
    if (parseInt(session.user.id) === userId) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), { status: 400, headers: corsHeaders });
    }

    // Get user data before deletion for audit trail
    const beforeUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!beforeUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
    }

    await prisma.user.delete({ where: { id: userId } });

    // Record audit
    try {
      await recordAudit({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email,
        actorRole: session.user.role,
        action: 'DELETE',
        entity: isStaffRole(beforeUser.role) ? 'Staff' : 'User',
        entityId: String(userId),
        details: JSON.stringify({
          summary: `Deleted ${isStaffRole(beforeUser.role) ? 'staff' : 'user'} ${beforeUser.name || beforeUser.email}`,
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
