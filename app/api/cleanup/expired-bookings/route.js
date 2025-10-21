import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Call the existing hold release endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const releaseResponse = await fetch(`${baseUrl}/api/hold/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const releaseData = await releaseResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Expired bookings cleanup completed',
      details: releaseData
    });
  } catch (error) {
    console.error('❌ Cleanup Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to cleanup expired bookings' 
    }, { status: 500 });
  }
}

export async function GET() {
  // Allow GET requests for easier testing
  return POST();
}