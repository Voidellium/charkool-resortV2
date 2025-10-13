import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const FALLBACK_FILE = path.join(process.cwd(), 'data', 'audit-fallback.json');

export async function GET() {
  try {
    console.log('Debug: Fallback file path:', FALLBACK_FILE);
    console.log('Debug: Current working directory:', process.cwd());
    
    // Check if file exists
    try {
      await fs.access(FALLBACK_FILE);
      console.log('Debug: Fallback file exists');
    } catch {
      console.log('Debug: Fallback file does not exist');
      return NextResponse.json({ error: 'Fallback file not found', path: FALLBACK_FILE });
    }
    
    // Try to read the file
    const raw = await fs.readFile(FALLBACK_FILE, 'utf8');
    const data = JSON.parse(raw || '[]');
    
    return NextResponse.json({
      success: true,
      path: FALLBACK_FILE,
      recordCount: data.length,
      latestRecord: data[0] || null,
      sampleRecords: data.slice(0, 3)
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message, path: FALLBACK_FILE });
  }
}