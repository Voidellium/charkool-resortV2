/**
 * Auth helpers for unified front desk (Cashier + legacy Super Admin access).
 */

export function isCashierStaff(role) {
  const r = String(role || '').toUpperCase();
  return r === 'CASHIER' || r === 'SUPERADMIN';
}

export function canAccessReceptionApis(role) {
  return isCashierStaff(role);
}

/** Audit writes from Bookings flows: CASHIER role + "Cashier" label for new entries. */
export function getAuditWriteMeta(role) {
  const r = String(role || '').toUpperCase();
  if (r === 'CASHIER') {
    return { actorRole: 'CASHIER', actorLabel: 'Cashier' };
  }
  if (r === 'SUPERADMIN') {
    return { actorRole: 'SUPERADMIN', actorLabel: 'Super Admin' };
  }
  return { actorRole: r || 'UNKNOWN', actorLabel: r || 'Staff' };
}
