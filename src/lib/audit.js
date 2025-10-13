import prisma from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

// Add debug logging
console.log('🔍 Audit module loaded, prisma available:', !!prisma);

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
 * IMPORTANT: Audit records should NEVER be deleted or modified once created.
 */
export async function recordAudit(data) {
  // Validate required fields
  if (!data.action || !data.entity) {
    throw new Error('Audit entry must have action and entity');
  }
  
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
      console.log('Attempting to create audit record in database...', entry);
      const created = await prisma.auditTrail.create({ data: {
        actorId: entry.actorId,
        actorName: entry.actorName,
        actorRole: entry.actorRole,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        details: entry.details,
      }});
      console.log('Audit record created in database successfully:', created);
      return created;
    } else {
      console.log('Prisma client or auditTrail model not available, using fallback');
    }
  } catch (err) {
    console.error('Prisma audit write failed, falling back to file:', err);
  }

  // Fallback: append to local JSON file so UI can read it
  // IMPORTANT: This file should be treated as append-only to maintain audit integrity
  try {
    console.log('Using fallback file for audit record...', entry);
    await ensureFallbackFile();
    const raw = await fs.readFile(FALLBACK_FILE, 'utf8');
    let arr = [];
    try { arr = JSON.parse(raw || '[]'); } catch (e) { arr = []; }
    const fallbackEntry = { id: `f-${Date.now()}-${Math.floor(Math.random()*10000)}`, ...entry };
    
    // Always add to beginning for newest-first ordering
    // Never remove existing entries to maintain audit integrity
    arr.unshift(fallbackEntry);
    
    // Limit file size by keeping only the most recent 10000 entries
    // (but never delete, only move to archive if needed)
    if (arr.length > 10000) {
      console.warn('Audit fallback file approaching size limit. Consider archiving old entries.');
    }
    
    await fs.writeFile(FALLBACK_FILE, JSON.stringify(arr, null, 2), 'utf8');
    console.log('Audit record written to fallback file successfully:', fallbackEntry.id);
    return fallbackEntry;
  } catch (err) {
    console.error('Failed to write fallback audit entry', err);
    // As last resort, return the in-memory entry
    return entry;
  }
}
