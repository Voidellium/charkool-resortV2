import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Call the existing hold release endpoint
    const releaseResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/hold/release`, {
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