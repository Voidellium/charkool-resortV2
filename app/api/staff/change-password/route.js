import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// Staff roles that can use this endpoint
const STAFF_ROLES = ['SUPERADMIN', 'RECEPTIONIST', 'CASHIER', 'AMENITYINVENTORYMANAGER'];

/**
 * POST /api/staff/change-password
 * Allows authenticated staff members to change their password
 * 
 * Request body:
 * - currentPassword: string (required)
 * - newPassword: string (required, min 8 characters)
 * - confirmPassword: string (required, must match newPassword)
 */
export async function POST(req) {
  try {
    // Verify authentication
    const token = await getToken({ req, secret: JWT_SECRET });
    
    if (!token?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = parseInt(token.sub);
    const userRole = token.role?.toUpperCase();

    // Verify user is a staff member
    if (!STAFF_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'This feature is only available for staff accounts.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match.' },
        { status: 400 }
      );
    }

    // Check that new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from your current password.' },
        { status: 400 }
      );
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Verify current password
    if (!user.password) {
      return NextResponse.json(
        { error: 'Cannot change password for this account type. Please use forgot password instead.' },
        { status: 400 }
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Log the password change in audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: 'PASSWORD_CHANGE',
          entity: 'User',
          entityId: String(userId),
          performedBy: user.name || user.email,
          details: JSON.stringify({
            summary: `Staff member ${user.name} (${user.role}) changed their password`,
            userId: userId,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (auditErr) {
      // Don't fail password change if audit fails
      console.error('Failed to log password change audit:', auditErr);
    }

    console.log(`✅ Password changed successfully for staff: ${user.email} (${user.role})`);

    return NextResponse.json(
      { message: 'Password changed successfully.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Staff password change error:', error);
    return NextResponse.json(
      { error: 'An error occurred while changing your password. Please try again.' },
      { status: 500 }
    );
  }
}
