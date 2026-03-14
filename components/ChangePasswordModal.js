'use client';
import { useState } from 'react';
import { X, Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * ChangePasswordModal - A reusable modal for staff members to change their password
 * 
 * Usage:
 * <ChangePasswordModal
 *   isOpen={showChangePassword}
 *   onClose={() => setShowChangePassword(false)}
 *   onSuccess={() => console.log('Password changed!')}
 * />
 */
export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password strength indicators
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strengths = [
      { label: 'Very Weak', color: '#ef4444' },
      { label: 'Weak', color: '#f97316' },
      { label: 'Fair', color: '#eab308' },
      { label: 'Good', color: '#22c55e' },
      { label: 'Strong', color: '#16a34a' },
    ];

    return { score, ...strengths[Math.min(score, 4)] };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/staff/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password changed successfully!');
        setTimeout(() => {
          resetForm();
          onClose();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        setError(data.error || 'Failed to change password. Please try again.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Lock size={24} style={{ color: '#FEBE52' }} />
            <h2 style={styles.title}>Change Password</h2>
          </div>
          <button
            onClick={handleClose}
            style={styles.closeButton}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div style={styles.successBox}>
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          {/* Current Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Current Password *</label>
            <div style={styles.inputWrapper}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                style={styles.input}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeButton}
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>New Password *</label>
            <div style={styles.inputWrapper}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password (min. 8 characters)"
                style={styles.input}
                disabled={isLoading}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeButton}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Password Strength Indicator */}
            {newPassword && (
              <div style={styles.strengthContainer}>
                <div style={styles.strengthBar}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      style={{
                        ...styles.strengthSegment,
                        backgroundColor:
                          level <= passwordStrength.score
                            ? passwordStrength.color
                            : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>
                <span style={{ ...styles.strengthLabel, color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Confirm New Password *</label>
            <div style={styles.inputWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                style={{
                  ...styles.input,
                  borderColor:
                    confirmPassword && newPassword !== confirmPassword
                      ? '#ef4444'
                      : confirmPassword && newPassword === confirmPassword
                      ? '#22c55e'
                      : '#e5e7eb',
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <span style={styles.fieldError}>Passwords do not match</span>
            )}
          </div>

          {/* Password Requirements */}
          <div style={styles.requirements}>
            <p style={styles.requirementsTitle}>Password Requirements:</p>
            <ul style={styles.requirementsList}>
              <li style={{ color: newPassword.length >= 8 ? '#22c55e' : '#6b7280' }}>
                At least 8 characters
              </li>
              <li style={{ color: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? '#22c55e' : '#6b7280' }}>
                Mix of uppercase and lowercase letters
              </li>
              <li style={{ color: /[0-9]/.test(newPassword) ? '#22c55e' : '#6b7280' }}>
                At least one number
              </li>
              <li style={{ color: /[^a-zA-Z0-9]/.test(newPassword) ? '#22c55e' : '#6b7280' }}>
                At least one special character (recommended)
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={handleClose}
              style={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span style={styles.spinner}></span>
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    padding: '16px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '450px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  },
  form: {
    padding: '24px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#16a34a',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    color: '#374151',
    fontSize: '0.9rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '12px 44px 12px 12px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  },
  fieldError: {
    color: '#dc2626',
    fontSize: '0.8rem',
    marginTop: '4px',
    display: 'block',
  },
  strengthContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
  },
  strengthBar: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  strengthSegment: {
    height: '4px',
    flex: 1,
    borderRadius: '2px',
    transition: 'background-color 0.2s ease',
  },
  strengthLabel: {
    fontSize: '0.8rem',
    fontWeight: '500',
    minWidth: '70px',
    textAlign: 'right',
  },
  requirements: {
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  requirementsTitle: {
    margin: '0 0 8px 0',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#374151',
  },
  requirementsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '0.8rem',
    lineHeight: '1.6',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #FEBE52 0%, #EBD591 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// Add keyframes animation for spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  try {
    styleSheet.insertRule(`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `, styleSheet.cssRules.length);
  } catch (e) {
    // Ignore if rule already exists
  }
}
