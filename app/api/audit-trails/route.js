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

    // Support pagination via query params: ?page=1&pageSize=50
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(500, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
    const skip = (page - 1) * pageSize;

    // Try both database and fallback file, combine results
    let dbItems = [];
    let fileItems = [];

    // Try database first
    try {
      if (prisma && prisma.auditTrail) {
        console.log('Checking database for audit records...');
        dbItems = await prisma.auditTrail.findMany({ 
          orderBy: { timestamp: 'desc' },
          take: pageSize * 2 // Get more to allow for merging
        });
        console.log(`Found ${dbItems.length} records in database`);
      }
    } catch (dbErr) {
      console.error('Database audit query failed:', dbErr);
    }

    // Always try fallback file as well
    try {
      console.log('Checking fallback file for audit records...');
      const raw = await fs.readFile(FALLBACK_FILE, 'utf8');
      const arr = JSON.parse(raw || '[]');
      fileItems = arr;
      console.log(`Found ${fileItems.length} records in fallback file`);
    } catch (fileErr) {
      console.error('Fallback file read failed:', fileErr);
    }

    // Combine and deduplicate results (prioritize DB records by ID)
    const allItems = [...dbItems];
    const dbIds = new Set(dbItems.map(item => item.id));
    
    // Add file items that don't exist in DB
    fileItems.forEach(fileItem => {
      if (!dbIds.has(fileItem.id)) {
        allItems.push(fileItem);
      }
    });

    // Sort by timestamp (newest first) and paginate
    allItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const total = allItems.length;
    const items = allItems.slice(skip, skip + pageSize);
    
    console.log(`Returning ${items.length} audit records (total: ${total})`);
    return NextResponse.json({ data: items, meta: { total, page, pageSize } });
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

// DELETE is not allowed for audit records - they should never be deleted
export async function DELETE() {
  return NextResponse.json({ error: 'Audit records cannot be deleted' }, { status: 403 });
}
