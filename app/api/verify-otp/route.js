import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: 'Email and OTP required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find the latest OTP for the email
    const otpRecord = await prisma.OTP.findFirst({
      where: {
        email,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: 'No OTP found or OTP has expired. Please request a new one.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if OTP is disabled due to too many failed attempts
    if (otpRecord.isDisabled) {
      return new Response(JSON.stringify({ 
        error: 'This OTP has been disabled due to too many incorrect attempts. Please request a new OTP.',
        requiresNewOTP: true 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      // Increment attempt count
      const updatedAttemptCount = otpRecord.attemptCount + 1;
      const maxAttempts = 3;

      if (updatedAttemptCount >= maxAttempts) {
        // Disable this OTP
        await prisma.OTP.update({
          where: { id: otpRecord.id },
          data: { 
            attemptCount: updatedAttemptCount,
            isDisabled: true 
          }
        });

        return new Response(JSON.stringify({ 
          error: 'Too many incorrect attempts. This OTP has been disabled. Please request a new OTP.',
          requiresNewOTP: true 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Just increment the count
        await prisma.OTP.update({
          where: { id: otpRecord.id },
          data: { attemptCount: updatedAttemptCount }
        });

        const attemptsLeft = maxAttempts - updatedAttemptCount;
        return new Response(JSON.stringify({ 
          error: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
          attemptsLeft 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // OTP is correct - proceed with user creation
    // Compute full name
    const fullName = [otpRecord.firstName, otpRecord.middleName, otpRecord.lastName].filter(Boolean).join(' ');

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name: fullName,
        firstName: otpRecord.firstName,
        middleName: otpRecord.middleName,
        lastName: otpRecord.lastName,
        birthdate: otpRecord.birthdate,
        contactNumber: otpRecord.contactNumber,
        email: otpRecord.email,
        password: otpRecord.password,
        emailVerified: new Date(),
      },
    });

    // Delete the OTP
    await prisma.OTP.delete({ where: { id: otpRecord.id } });

    return new Response(JSON.stringify({ message: 'Email verified successfully', user: { id: newUser.id, name: newUser.name, email: newUser.email } }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
