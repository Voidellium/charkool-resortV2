// Professional Toast Notification System

'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import styles from './Toast.module.css';

// Toast Context
const ToastContext = createContext(null);

// Toast Types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error', 
  WARNING: 'warning',
  INFO: 'info'
};

// Individual Toast Component
const Toast = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.type) {
      case TOAST_TYPES.SUCCESS:
        return <CheckCircle size={20} />;
      case TOAST_TYPES.ERROR:
        return <AlertCircle size={20} />;
      case TOAST_TYPES.WARNING:
        return <AlertTriangle size={20} />;
      case TOAST_TYPES.INFO:
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div 
      className={`${styles.toast} ${styles[toast.type]} ${toast.isExiting ? styles.exiting : ''}`}
      onClick={() => onDismiss(toast.id)}
    >
      <div className={styles.toastIcon}>
        {getIcon()}
      </div>
      
      <div className={styles.toastContent}>
        {toast.title && <div className={styles.toastTitle}>{toast.title}</div>}
        <div className={styles.toastMessage}>{toast.message}</div>
      </div>
      
      <button 
        className={styles.toastClose} 
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Toast Container
const ToastContainer = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onDismiss={onDismiss} 
        />
      ))}
    </div>
  );
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: TOAST_TYPES.INFO,
      duration: 5000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id 
          ? { ...toast, isExiting: true }
          : toast
      )
    );

    // Remove after exit animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => 
    addToast({ message, type: TOAST_TYPES.SUCCESS, ...options }), [addToast]);

  const error = useCallback((message, options = {}) => 
    addToast({ message, type: TOAST_TYPES.ERROR, duration: 7000, ...options }), [addToast]);

  const warning = useCallback((message, options = {}) => 
    addToast({ message, type: TOAST_TYPES.WARNING, duration: 6000, ...options }), [addToast]);

  const info = useCallback((message, options = {}) => 
    addToast({ message, type: TOAST_TYPES.INFO, ...options }), [addToast]);

  const value = {
    toasts,
    addToast,
    dismissToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Provide fallback functions during SSR or when provider is missing
    return {
      success: (message) => console.log('Toast Success:', message),
      error: (message) => console.error('Toast Error:', message),
      warning: (message) => console.warn('Toast Warning:', message),
      info: (message) => console.info('Toast Info:', message),
      addToast: () => {},
      dismissToast: () => {},
      clearAllToasts: () => {},
      toasts: []
    };
  }
  return context;
};

// Confirmation Modal Component for replacements
export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger" // 'danger', 'warning', 'primary'
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.modalMessage}>{message}</p>
        </div>
        
        <div className={styles.modalActions}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={`${styles.confirmButton} ${styles[variant]}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};