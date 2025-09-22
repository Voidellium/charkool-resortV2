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
        otp,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
