import { NextResponse } from 'next/server';

// Temporary audit-trails API
// If a real AuditTrail model exists in Prisma, replace the mock with a prisma query.
export async function GET(req) {
  // Example mock data — shape: { id, actorName, actorRole, action, entity, details, timestamp }
  const sample = [
    {
      id: 1,
      actorName: 'Alice Johnson',
      actorRole: 'ADMIN',
      action: 'UPDATE',
      entity: 'Policy',
      details: 'Updated policy title from "Check-in" to "Check-in Times"',
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      actorName: 'Super Admin',
      actorRole: 'SUPERADMIN',
      action: 'DELETE',
      entity: 'Room',
      details: 'Deleted Room #12 (beachfront)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: 3,
      actorName: 'Carlos Mendoza',
      actorRole: 'ADMIN',
      action: 'CREATE',
      entity: 'Amenity',
      details: 'Added "Pool Towels" optional amenity',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ];

  return NextResponse.json({ data: sample });
}
