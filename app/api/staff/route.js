import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { STAFF_ROLES, isStaffRole } from '@/lib/roles';

const prisma = new PrismaClient();

/**
 * POST - Create new staff account
 * Only SuperAdmin can create staff accounts
 * Staff accounts are created with password (no OTP verification needed)
 */
export async function POST(req) {
  try {
    // Require authenticated SuperAdmin session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    if (session.user.role !== 'SUPERADMIN') {
      return new Response(JSON.stringify({ error: 'Only Super Admin can create staff accounts' }), { status: 403 });
    }

    const { name, email, password, role } = await req.json();

    // Validate required fields
    if (!name || !email || !password || !role) {
      return new Response(JSON.stringify({ error: 'All fields are required: name, email, password, role' }), { status: 400 });
    }

    // Validate role is a staff role (no customer creation via this endpoint)
    if (!isStaffRole(role)) {
      return new Response(JSON.stringify({ 
        error: `Invalid staff role. Valid roles are: ${STAFF_ROLES.join(', ')}` 
      }), { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters long' }), { status: 400 });
    }

    // Lowercase and trim email
    const lowercasedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: lowercasedEmail } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email is already registered' }), { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Create staff account
    const newStaff = await prisma.user.create({
      data: {
        name: name.trim(),
        email: lowercasedEmail,
        password: hashedPassword,
        role,
        isVerified: true, // Staff accounts are pre-verified
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        createdAt: true 
      },
    });

    // Record audit trail
    try {
      await recordAudit({
        actorId: session.user.id,
        actorName: session.user.name || session.user.email,
        actorRole: session.user.role,
        action: 'CREATE',
        entity: 'Staff',
        entityId: String(newStaff.id),
        details: JSON.stringify({
          summary: `Created staff account for ${newStaff.name} with role ${newStaff.role}`,
          staffEmail: newStaff.email,
          staffRole: newStaff.role,
        }),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for staff creation:', auditErr);
    }

    // Create notification for super admins
    try {
      await prisma.notification.create({
        data: {
          message: `New staff account created: ${newStaff.name} (${newStaff.role})`,
          type: 'staff_created',
          role: 'superadmin',
        },
      });
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr);
    }

    return new Response(JSON.stringify(newStaff), { status: 201 });
  } catch (err) {
    console.error('Staff creation error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

/**
 * GET - List all staff accounts
 */
export async function GET(req) {
  try {
    // Require authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Only SuperAdmin can list staff
    if (session.user.role !== 'SUPERADMIN') {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
    }

    const staff = await prisma.user.findMany({
      where: {
        role: { in: STAFF_ROLES },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return new Response(JSON.stringify(staff), { status: 200 });
  } catch (err) {
    console.error('Staff list error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
