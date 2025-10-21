'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigationContext } from '../context/NavigationContext';

export const useNavigationGuard = ({
  trackForms = false,
  trackBooking = false,
  trackPayment = false,
  customMessage = null,
  bypassPaths = [],
  formId = null,
  // New logout protection parameters
  shouldPreventNavigation = null,
  onNavigationAttempt = null,
  customAction = null,
  context = null,
  message = null
} = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const navigationContext = useNavigationContext();
  
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const isNavigatingRef = useRef(false);

  // Check if navigation confirmation is disabled for this session
  const isConfirmationDisabled = () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('navigationConfirmation_disabled') === 'true';
  };

  // Check if current path should bypass confirmation
  const shouldBypass = useCallback((targetPath = null) => {
    if (isConfirmationDisabled()) return true;
    
    const currentPath = pathname;
    
    // Always bypass logout actions
    if (targetPath && targetPath.includes('/api/auth/signout')) return true;
    
    // Bypass paths specified in config
    if (bypassPaths.some(path => currentPath.includes(path))) return true;
    
    // Internal flow bypasses (same base path navigation)
    if (targetPath && currentPath && targetPath !== currentPath) {
      // Allow navigation within booking flow steps
      if (currentPath.includes('/booking') && targetPath.includes('/booking')) {
        return true;
      }
      // Allow navigation within admin sections
      if (currentPath.includes('/admin') && targetPath.includes('/admin')) {
        return true;
      }
    }
    
    return false;
  }, [pathname, bypassPaths]);

  // Modal event handlers
  const handleStay = useCallback((dontAskAgain) => {
    setShowModal(false);
    setPendingNavigation(null);
    isNavigatingRef.current = false;
    
    if (dontAskAgain) {
      sessionStorage.setItem('navigationConfirmation_disabled', 'true');
    }
  }, []);

  const handleLeave = useCallback((dontAskAgain) => {
    setShowModal(false);
    isNavigatingRef.current = true;
    
    if (dontAskAgain) {
      sessionStorage.setItem('navigationConfirmation_disabled', 'true');
    }

    // Clear all navigation states
    navigationContext.clearAllStates();
    
    // Execute pending navigation
    if (pendingNavigation) {
      pendingNavigation();
    }
    
    setPendingNavigation(null);
  }, [pendingNavigation, navigationContext]);

  // Mouse button navigation handler (mouse button 3/4 for back/forward)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigationContext) return;

    const handleMouseDown = (event) => {
      // Mouse button 3 (back) or 4 (forward)
      if (event.button === 3 || event.button === 4) {
        if (isNavigatingRef.current || isConfirmationDisabled()) {
          return;
        }

        const shouldPrevent = shouldPreventNavigation ? shouldPreventNavigation() : navigationContext.shouldPreventNavigation?.();
        
        if (!shouldPrevent) {
          return;
        }

        // Call onNavigationAttempt callback if provided
        if (onNavigationAttempt) {
          onNavigationAttempt();
        }

        console.log('🚫 Preventing mouse navigation and showing modal');
        event.preventDefault();
        
        setPendingNavigation(() => () => {
          console.log('🚀 Executing pending mouse navigation');
          isNavigatingRef.current = true;
          
          // Use custom action if provided, otherwise default mouse navigation
          if (customAction) {
            customAction();
          } else {
            // Simulate the mouse navigation
            if (event.button === 3) {
              window.history.back();
            } else {
              window.history.forward();
            }
          }
        });
        setShowModal(true);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [navigationContext]);

  // Set up navigation trap when protection becomes active
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldPrevent = shouldPreventNavigation ? shouldPreventNavigation() : navigationContext?.shouldPreventNavigation?.();
    
    if (shouldPrevent && !isConfirmationDisabled()) {
      console.log('🔒 Setting up navigation trap');
      // Add a state to history so we can catch back button presses
      window.history.pushState({ navigationTrap: true }, '', window.location.href);
    }
  }, [shouldPreventNavigation, navigationContext]);

  // Browser back/forward navigation handler (simplified)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigationContext) return;

    const handlePopState = (event) => {
      console.log('🔄 POPSTATE EVENT FIRED!', event);
      console.log('🔄 Current URL:', window.location.href);
      console.log('🔄 Modal showing:', showModal);
      console.log('🔄 Is navigating:', isNavigatingRef.current);
      try {
        if (isNavigatingRef.current) {
          console.log('🔄 Already navigating, allowing...');
          return;
        }
        
        if (isConfirmationDisabled()) {
          console.log('🔄 Confirmation disabled for session, allowing...');
          return;
        }

        const shouldPrevent = shouldPreventNavigation ? shouldPreventNavigation() : navigationContext.shouldPreventNavigation?.();
        console.log('🔄 Should prevent navigation:', shouldPrevent);
        
        if (!shouldPrevent) {
          console.log('🔄 No prevention needed, allowing navigation...');
          return;
        }

        // Call onNavigationAttempt callback if provided
        if (onNavigationAttempt) {
          onNavigationAttempt();
        }

        console.log('🚫 Preventing navigation and showing modal');
        
        // CRITICAL: We can't prevent the popstate, but we can immediately reverse it
        // This pushes the current URL back as the active state
        window.history.pushState({ preventedNavigation: true }, '', window.location.href);
        
        // Set a flag to prevent loops
        if (!showModal) {
          // Show confirmation modal
          setPendingNavigation(() => () => {
            console.log('🚀 Executing pending navigation');
            isNavigatingRef.current = true;
            
            // Use custom action if provided (e.g., for logout), otherwise default behavior
            if (customAction) {
              customAction();
            } else {
              window.history.back();
            }
          });
          console.log('📱 About to set showModal to true');
          setShowModal(true);
          console.log('📱 setShowModal(true) called');
        }
      } catch (error) {
        console.error('Error in popstate handler:', error);
      }
    };

    console.log('🔧 Adding popstate event listener');
    window.addEventListener('popstate', handlePopState);

    return () => {
      console.log('🔧 Removing popstate event listener');
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldPreventNavigation, onNavigationAttempt, customAction, navigationContext]);

  // Page refresh/close handler (F5, Ctrl+R, etc.)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigationContext) return;

    const handleBeforeUnload = (event) => {
      try {
        if (isNavigatingRef.current || isConfirmationDisabled()) {
          return;
        }

        if (!navigationContext.shouldPreventNavigation || !navigationContext.shouldPreventNavigation()) {
          return;
        }

        // Show browser's native confirmation dialog
        const message = customMessage || 'You have unsaved changes. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      } catch (error) {
        console.error('Error in beforeunload handler:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigationContext, customMessage]);

  // Form state management
  useEffect(() => {
    if (!trackForms || !formId || !navigationContext?.registerForm) return;

    try {
      navigationContext.registerForm(formId, false);

      return () => {
        if (navigationContext?.unregisterForm) {
          navigationContext.unregisterForm(formId);
        }
      };
    } catch (error) {
      console.error('Error registering form:', error);
    }
  }, [trackForms, formId, navigationContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (formId && navigationContext?.unregisterForm) {
          navigationContext.unregisterForm(formId);
        }
      } catch (error) {
        console.error('Error unregistering form on unmount:', error);
      }
    };
  }, [formId, navigationContext]);

  // Public methods for manual navigation (simplified)
  const navigate = useCallback((path) => {
    try {
      if (shouldBypass(path) || !navigationContext?.shouldPreventNavigation?.()) {
        router.push(path);
        return;
      }
      setPendingNavigation(() => () => router.push(path));
      setShowModal(true);
    } catch (error) {
      console.error('Error in navigate:', error);
      router.push(path); // Fallback to normal navigation
    }
  }, [router, shouldBypass, navigationContext]);

  const replace = useCallback((path) => {
    try {
      if (shouldBypass(path) || !navigationContext?.shouldPreventNavigation?.()) {
        router.replace(path);
        return;
      }
      setPendingNavigation(() => () => router.replace(path));
      setShowModal(true);
    } catch (error) {
      console.error('Error in replace:', error);
      router.replace(path); // Fallback to normal navigation
    }
  }, [router, shouldBypass, navigationContext]);

  const back = useCallback(() => {
    try {
      if (shouldBypass() || !navigationContext?.shouldPreventNavigation?.()) {
        router.back();
        return;
      }
      setPendingNavigation(() => () => router.back());
      setShowModal(true);
    } catch (error) {
      console.error('Error in back:', error);
      router.back(); // Fallback to normal navigation
    }
  }, [router, shouldBypass, navigationContext]);

  // Form state helpers
  const markFormDirty = useCallback((dirty = true) => {
    try {
      if (formId && navigationContext?.updateFormState) {
        navigationContext.updateFormState(formId, dirty);
      }
    } catch (error) {
      console.error('Error marking form dirty:', error);
    }
  }, [formId, navigationContext]);

  const markFormClean = useCallback(() => {
    try {
      if (formId && navigationContext?.updateFormState) {
        navigationContext.updateFormState(formId, false);
      }
    } catch (error) {
      console.error('Error marking form clean:', error);
    }
  }, [formId, navigationContext]);

  return {
    // Modal state
    showModal,
    handleStay,
    handleLeave,
    
    // Navigation methods
    navigate,
    replace,
    back,
    
    // Form helpers
    markFormDirty,
    markFormClean,
    
    // Context
    context: context || navigationContext?.getNavigationContext?.() || 'default',
    message: message || customMessage,
    

    
    // State
    isProtected: shouldPreventNavigation ? shouldPreventNavigation() : navigationContext?.shouldPreventNavigation?.() || false
  };
};