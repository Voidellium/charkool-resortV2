import prisma from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

const FALLBACK_DIR = path.join(process.cwd(), 'data');
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'audit-fallback.json');

async function ensureFallbackFile() {
  try {
    await fs.mkdir(FALLBACK_DIR, { recursive: true });
    try {
      await fs.access(FALLBACK_FILE);
    } catch (_e) {
      await fs.writeFile(FALLBACK_FILE, JSON.stringify([]), 'utf8');
    }
  } catch (e) {
    console.error('Failed to prepare fallback audit file', e);
  }
}

/**
 * Record an audit trail entry.
 * Returns the created entry object (DB record or fallback object).
 */
export async function recordAudit(data) {
  const entry = {
    actorId: data.actorId ?? null,
    actorName: data.actorName ?? 'Unknown',
    actorRole: data.actorRole ?? 'ADMIN',
    action: data.action,
    entity: data.entity,
    entityId: data.entityId ?? null,
    details: data.details ?? null,
    timestamp: new Date().toISOString(),
  };

  // Try DB first
  try {
    if (prisma && prisma.auditTrail) {
      const created = await prisma.auditTrail.create({ data: {
        actorId: entry.actorId,
        actorName: entry.actorName,
        actorRole: entry.actorRole,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        details: entry.details,
      }});
      return created;
    }
  } catch (err) {
    console.error('Prisma audit write failed, falling back to file:', err);
  }

  // Fallback: append to local JSON file so UI can read it
  try {
    await ensureFallbackFile();
    const raw = await fs.readFile(FALLBACK_FILE, 'utf8');
    let arr = [];
    try { arr = JSON.parse(raw || '[]'); } catch (e) { arr = []; }
    const fallbackEntry = { id: `f-${Date.now()}-${Math.floor(Math.random()*10000)}`, ...entry };
    arr.unshift(fallbackEntry);
    await fs.writeFile(FALLBACK_FILE, JSON.stringify(arr, null, 2), 'utf8');
    return fallbackEntry;
  } catch (err) {
    console.error('Failed to write fallback audit entry', err);
    // As last resort, return the in-memory entry
    return entry;
  }
}
