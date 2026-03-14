/**
 * Role management constants and utilities
 * Provides clear separation between Customer and Staff accounts
 */

// Staff roles - accounts created by SuperAdmin
export const STAFF_ROLES = ['SUPERADMIN', 'RECEPTIONIST', 'CASHIER', 'AMENITYINVENTORYMANAGER'];

// Customer role - accounts created through registration
export const CUSTOMER_ROLE = 'CUSTOMER';

// All valid roles
export const ALL_ROLES = [CUSTOMER_ROLE, ...STAFF_ROLES];

/**
 * Check if a role is a staff role
 * @param {string} role - The role to check
 * @returns {boolean} - True if staff role
 */
export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

/**
 * Check if a role is a customer role
 * @param {string} role - The role to check
 * @returns {boolean} - True if customer role
 */
export function isCustomerRole(role) {
  return role === CUSTOMER_ROLE;
}

/**
 * Get display name for a role
 * @param {string} role - The role
 * @returns {string} - Human-readable role name
 */
export function getRoleDisplayName(role) {
  const displayNames = {
    SUPERADMIN: 'Super Admin',
    RECEPTIONIST: 'Receptionist',
    CASHIER: 'Cashier',
    AMENITYINVENTORYMANAGER: 'Inventory Manager',
    CUSTOMER: 'Customer',
  };
  return displayNames[role] || role;
}

/**
 * Get role badge color
 * @param {string} role - The role
 * @returns {string} - CSS color value
 */
export function getRoleBadgeColor(role) {
  const colors = {
    SUPERADMIN: '#dc2626', // Red - highest authority
    RECEPTIONIST: '#2563eb', // Blue
    CASHIER: '#16a34a', // Green
    AMENITYINVENTORYMANAGER: '#9333ea', // Purple
    CUSTOMER: '#6b7280', // Gray
  };
  return colors[role] || '#6b7280';
}

/**
 * Validate role transition (for editing)
 * Staff can only change to other staff roles
 * Customers cannot be promoted to staff
 * @param {string} fromRole - Current role
 * @param {string} toRole - New role
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRoleTransition(fromRole, toRole) {
  // Same role is always valid
  if (fromRole === toRole) {
    return { valid: true };
  }

  // Customer cannot become staff
  if (isCustomerRole(fromRole) && isStaffRole(toRole)) {
    return { 
      valid: false, 
      error: 'Customers cannot be promoted to staff roles. Create a separate staff account instead.' 
    };
  }

  // Staff cannot become customer
  if (isStaffRole(fromRole) && isCustomerRole(toRole)) {
    return { 
      valid: false, 
      error: 'Staff accounts cannot be demoted to customer. Deactivate the account instead.' 
    };
  }

  // Staff to staff transition is valid
  if (isStaffRole(fromRole) && isStaffRole(toRole)) {
    return { valid: true };
  }

  return { valid: false, error: 'Invalid role transition' };
}
