import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAudit } from '@/src/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { promises as fs } from 'fs';
import path from 'path';

const FALLBACK_FILE = path.join(process.cwd(), 'data', 'audit-fallback.json');

export async function GET(req) {
  try {
    // Only allow superadmins to read audit logs
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'SUPERADMIN') {
      return NextResponse.json({ data: [], error: 'Unauthorized' }, { status: 403 });
    }
    if (prisma && prisma.auditTrail) {
      const items = await prisma.auditTrail.findMany({ orderBy: { timestamp: 'desc' }, take: 200 });
      return NextResponse.json({ data: items });
    }

    // Fallback: read file-based entries
    try {
      const raw = await fs.readFile(FALLBACK_FILE, 'utf8');
      const arr = JSON.parse(raw || '[]');
      return NextResponse.json({ data: arr });
    } catch (err) {
      return NextResponse.json({ data: [] });
    }
  } catch (err) {
    console.error('GET /api/audit-trails error', err);
    return NextResponse.json({ data: [], error: String(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const created = await (async () => {
      // Use the helper to persist (DB or fallback file)
      return await recordAudit(body);
    })();

    return NextResponse.json({ data: created });
  } catch (err) {
    console.error('POST /api/audit-trails error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
