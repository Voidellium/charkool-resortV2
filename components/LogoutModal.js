"use client";
import React, { useEffect, useRef, useState } from 'react';
import styles from './LogoutModal.module.css';

export default function LogoutModal({
  show,
  user,
  onCancel,
  onConfirm,
  isProcessing = false,
}) {
  const overlayRef = useRef(null);
  const confirmRef = useRef(null);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    if (user?.name) setFirstName(user.name.split(' ')[0]);
  }, [user]);

  useEffect(() => {
    if (show) {
      // Focus confirm for quick keyboard enter
      confirmRef.current?.focus();
      const onKey = (e) => {
        if (e.key === 'Escape') onCancel?.();
        if (e.key === 'Enter') onConfirm?.();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [show, onCancel, onConfirm]);

  if (!show) return null;

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onCancel?.(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="logout-title">
        <div className={styles.header}>
          <h3 id="logout-title" className={styles.title}>Sign out of your account?</h3>
          <p className={styles.subtitle}>You can always sign back in. We’ll save your changes and finish any in-flight operations before you go.</p>
        </div>
        <div className={styles.body}>
          <div className={styles.user}>
            <div className={styles.avatar} aria-hidden>
              {firstName ? firstName[0].toUpperCase() : '👤'}
            </div>
            <div>
              <div className={styles.name}>{user?.name || 'Current User'}</div>
              <div className={styles.meta}>{user?.email || '—'}</div>
              {user?.role && <div className={styles.roleTag}>{String(user.role).toUpperCase()}</div>}
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.help}>Need to finish something? You can cancel and stay here.</div>
          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.cancel}`} onClick={onCancel} disabled={isProcessing}>Stay</button>
            <button ref={confirmRef} className={`${styles.btn} ${styles.confirm}`} onClick={onConfirm} disabled={isProcessing}>
              {isProcessing ? <>Signing out<span className={styles.spinner} /></> : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
