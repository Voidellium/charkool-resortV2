import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d){ const x=new Date(d); x.setHours(23,59,59,999); return x; }

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || (role !== 'CASHIER' && role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString();
    const format = searchParams.get('format') || 'json'; // json | csv | pdf
    const day = new Date(dateStr);
    const from = startOfDay(day);
    const to = endOfDay(day);

    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { booking: true }
    });

    const rows = payments.map(p => ({
      paymentId: p.id,
      bookingId: p.bookingId,
      guestName: p.booking?.guestName || '',
      amount: Number(p.amount)/100,
      status: p.status,
      method: p.method || p.provider,
      verificationStatus: p.verificationStatus,
      createdAt: p.createdAt.toISOString()
    }));

    if (format === 'csv') {
      const { Parser } = await import('json2csv');
      const parser = new Parser();
      const csv = parser.parse(rows);
      return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv' } });
    }
    if (format === 'pdf') {
      const PDFDocument = (await import('pdfkit')).default;
      const { Readable } = await import('node:stream');
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const stream = new Readable({ read(){ } });
      doc.on('data', chunk => stream.push(chunk));
      doc.on('end', () => stream.push(null));
      doc.fontSize(16).text('Daily Payments Report', { align: 'center' });
      doc.moveDown();
      rows.forEach(r => { doc.fontSize(10).text(`${r.createdAt} | Booking #${r.bookingId} | ₱${r.amount.toFixed(2)} | ${r.method} | ${r.status} | ${r.verificationStatus}`); });
      doc.end();
      return new NextResponse(stream, { headers: { 'Content-Type': 'application/pdf' } });
    }

    return NextResponse.json({ date: from.toISOString().slice(0,10), count: rows.length, total: rows.reduce((s,r)=>s+Number(r.amount),0), rows });
  } catch (e) {
    console.error('Reports error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
