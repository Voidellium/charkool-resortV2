import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
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

    // Record audit for user creation
    try {
      const session = await getServerSession(authOptions);
      await recordAudit({
        actorId: session?.user?.id || null,
        actorName: session?.user?.name || session?.user?.email || 'System',
        actorRole: session?.user?.role || 'SYSTEM',
        action: 'CREATE',
        entity: 'User',
        entityId: String(newUser.id),
        details: JSON.stringify({
          summary: `Created user account for ${newUser.name} (${newUser.role})`,
          after: newUser
        }),
      });
    } catch (auditErr) {
      console.error('Failed to record audit for user creation:', auditErr);
    }

    // Create notification for superadmin
    try {
      await prisma.notification.create({
        data: {
          message: `New user account created: ${newUser.name} (${newUser.email}) with role ${newUser.role}`,
          type: 'user_created',
          role: 'superadmin',
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return new Response(JSON.stringify(newUser), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// PUT update user profile (by authenticated user's ID)
export async function PUT(req) {
  try {
    // Require authenticated session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const {
      firstName,
      middleName,
      lastName,
      birthdate,
      contactNumber,
      email,
      image,
    } = await req.json();

    const userId = parseInt(session.user.id, 10);
    if (Number.isNaN(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid user id in session' }), { status: 400 });
    }

    // Build partial update object only with provided fields
    const data = {};
    if (typeof firstName !== 'undefined') data.firstName = firstName;
    if (typeof middleName !== 'undefined') data.middleName = middleName;
    if (typeof lastName !== 'undefined') data.lastName = lastName;
    if (typeof contactNumber !== 'undefined') data.contactNumber = contactNumber;
    if (typeof birthdate !== 'undefined') data.birthdate = birthdate ? new Date(birthdate) : null;
    if (typeof image !== 'undefined') data.image = image;
    if (typeof email !== 'undefined' && email) data.email = email.toLowerCase().trim();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        birthdate: true,
        contactNumber: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return new Response(JSON.stringify(updatedUser), { status: 200 });
  } catch (err) {
    // Handle unique constraint violations (e.g., duplicate email)
    if (err && typeof err === 'object' && err.code === 'P2002') {
      return new Response(
        JSON.stringify({ error: 'Conflict: email already in use.' }),
        { status: 409 }
      );
    }
    // Enhanced error logging for debugging
    let errorDetails = {};
    if (err instanceof Error) {
      errorDetails = { message: err.message, stack: err.stack, ...err };
    } else {
      errorDetails = { error: err };
    }
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: errorDetails }),
      { status: 500 }
    );
  }
}
