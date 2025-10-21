'use client';
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const NavigationContext = createContext();

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    // Return a dummy context instead of throwing error to prevent crashes
    console.warn('useNavigationContext used outside NavigationProvider, returning dummy context');
    return {
      registerForm: () => {},
      unregisterForm: () => {},
      updateFormState: () => {},
      formStates: new Map(),
      bookingState: { isActive: false, step: 0, hasData: false },
      updateBookingState: () => {},
      paymentState: { isActive: false, bookingId: null },
      updatePaymentState: () => {},
      shouldPreventNavigation: () => false,
      getNavigationContext: () => 'default',
      clearAllStates: () => {}
    };
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  // Track different types of states that should prevent navigation
  const [formStates, setFormStates] = useState(new Map()); // formId -> isDirty
  const [bookingState, setBookingState] = useState({
    isActive: false,
    step: 0,
    hasData: false
  });
  const [paymentState, setPaymentState] = useState({
    isActive: false,
    bookingId: null
  });

  // Register/unregister form tracking
  const registerForm = useCallback((formId, isDirty = false) => {
    setFormStates(prev => {
      if (prev.has(formId) && prev.get(formId) === isDirty) {
        return prev; // No change needed
      }
      const newMap = new Map(prev);
      newMap.set(formId, isDirty);
      return newMap;
    });
  }, []);

  const unregisterForm = useCallback((formId) => {
    setFormStates(prev => {
      if (!prev.has(formId)) {
        return prev; // No change needed
      }
      const newMap = new Map(prev);
      newMap.delete(formId);
      return newMap;
    });
  }, []);

  const updateFormState = useCallback((formId, isDirty) => {
    setFormStates(prev => {
      if (prev.has(formId) && prev.get(formId) === isDirty) {
        return prev; // No change needed
      }
      return new Map(prev.set(formId, isDirty));
    });
  }, []);

  // Booking state management
  const updateBookingState = useCallback((newState) => {
    setBookingState(prev => {
      // Only update if there's actually a change
      const hasChange = Object.keys(newState).some(key => prev[key] !== newState[key]);
      if (!hasChange) {
        return prev;
      }
      return { ...prev, ...newState };
    });
  }, []);

  // Payment state management
  const updatePaymentState = useCallback((newState) => {
    setPaymentState(prev => {
      // Only update if there's actually a change
      const hasChange = Object.keys(newState).some(key => prev[key] !== newState[key]);
      if (!hasChange) {
        return prev;
      }
      return { ...prev, ...newState };
    });
  }, []);

  // Check if navigation should be prevented
  const shouldPreventNavigation = useCallback(() => {
    // Check if any forms are dirty
    const hasUnsavedForms = Array.from(formStates.values()).some(isDirty => isDirty);
    
    // Check if booking is in progress
    const hasActiveBooking = bookingState.isActive && bookingState.hasData;
    
    // Check if payment is in progress
    const hasActivePayment = paymentState.isActive;

    return hasUnsavedForms || hasActiveBooking || hasActivePayment;
  }, [formStates, bookingState.isActive, bookingState.hasData, paymentState.isActive]);

  // Get appropriate context for the modal
  const getNavigationContext = useCallback(() => {
    if (paymentState.isActive) return 'payment';
    if (bookingState.isActive && bookingState.hasData) return 'booking';
    if (Array.from(formStates.values()).some(isDirty => isDirty)) {
      // Try to determine if it's admin context based on current path
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.includes('/admin') || path.includes('/super-admin') || path.includes('/amenityinventorymanager')) {
          return 'admin';
        }
        if (path.includes('/guest') || path.includes('/profile')) {
          return 'profile';
        }
      }
      return 'form';
    }
    return 'default';
  }, [formStates, bookingState.isActive, bookingState.hasData, paymentState.isActive]);

  // Clear all states (for successful submissions, logouts, etc.)
  const clearAllStates = useCallback(() => {
    setFormStates(new Map());
    setBookingState({ isActive: false, step: 0, hasData: false });
    setPaymentState({ isActive: false, bookingId: null });
  }, []);

  const value = useMemo(() => ({
    // Form tracking
    registerForm,
    unregisterForm,
    updateFormState,
    formStates,
    
    // Booking tracking
    bookingState,
    updateBookingState,
    
    // Payment tracking
    paymentState,
    updatePaymentState,
    
    // Navigation prevention
    shouldPreventNavigation,
    getNavigationContext,
    clearAllStates
  }), [
    registerForm,
    unregisterForm,
    updateFormState,
    formStates,
    bookingState,
    updateBookingState,
    paymentState,
    updatePaymentState,
    shouldPreventNavigation,
    getNavigationContext,
    clearAllStates
  ]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};