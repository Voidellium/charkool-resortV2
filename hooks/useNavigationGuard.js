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
  formId = null
} = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const navigationContext = useNavigationContext();
  
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const preventionActiveRef = useRef(true);
  const isNavigatingRef = useRef(false);
  const mouseButtonRef = useRef(null);

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
      preventionActiveRef.current = false;
    }
  }, []);

  const handleLeave = useCallback((dontAskAgain) => {
    setShowModal(false);
    isNavigatingRef.current = true;
    
    if (dontAskAgain) {
      preventionActiveRef.current = false;
    }

    // Clear all navigation states
    navigationContext.clearAllStates();
    
    // Execute pending navigation
    if (pendingNavigation) {
      pendingNavigation();
    }
    
    setPendingNavigation(null);
  }, [pendingNavigation, navigationContext]);

  // Browser back/forward navigation handler
  useEffect(() => {
    if (typeof window === 'undefined' || !preventionActiveRef.current) return;

    const handlePopState = (event) => {
      if (isNavigatingRef.current) {
        return;
      }

      if (isConfirmationDisabled() || !navigationContext.shouldPreventNavigation()) {
        return;
      }

      // Prevent the navigation
      event.preventDefault();
      window.history.pushState(null, '', window.location.href);
      
      // Show confirmation modal
      setPendingNavigation(() => () => {
        isNavigatingRef.current = true;
        window.history.back();
      });
      setShowModal(true);
    };

    // Push a state to detect back navigation
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigationContext]);

  // Mouse button navigation handler
  useEffect(() => {
    if (typeof window === 'undefined' || !preventionActiveRef.current) return;

    const handleMouseDown = (event) => {
      // Mouse button 3 (back) or 4 (forward)
      if (event.button === 3 || event.button === 4) {
        mouseButtonRef.current = event.button;
      }
    };

    const handleMouseUp = (event) => {
      if (mouseButtonRef.current === event.button && (event.button === 3 || event.button === 4)) {
        if (isNavigatingRef.current) {
          mouseButtonRef.current = null;
          return;
        }

        if (isConfirmationDisabled() || !navigationContext.shouldPreventNavigation()) {
          mouseButtonRef.current = null;
          return;
        }

        // Prevent default browser navigation
        event.preventDefault();
        event.stopPropagation();

        const isBack = event.button === 3;
        setPendingNavigation(() => () => {
          isNavigatingRef.current = true;
          if (isBack) {
            window.history.back();
          } else {
            window.history.forward();
          }
        });
        setShowModal(true);
        mouseButtonRef.current = null;
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [navigationContext]);

  // Page refresh/close handler (F5, Ctrl+R, etc.)
  useEffect(() => {
    if (typeof window === 'undefined' || !preventionActiveRef.current) return;

    const handleBeforeUnload = (event) => {
      if (isNavigatingRef.current) {
        return;
      }

      if (isConfirmationDisabled() || !navigationContext.shouldPreventNavigation()) {
        return;
      }

      // Show browser's native confirmation dialog
      const message = customMessage || 'You have unsaved changes. Are you sure you want to leave?';
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigationContext, customMessage]);

  // Touch/gesture navigation for mobile
  useEffect(() => {
    if (typeof window === 'undefined' || !preventionActiveRef.current) return;

    let touchStartX = null;
    let touchStartY = null;
    
    const handleTouchStart = (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchEnd = (event) => {
      if (!touchStartX || !touchStartY) return;

      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Check for horizontal swipe (back gesture)
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50;
      const isRightSwipe = deltaX > 0;
      
      // Right swipe from left edge (common back gesture)
      if (isHorizontalSwipe && isRightSwipe && touchStartX < 50) {
        if (isNavigatingRef.current) {
          return;
        }

        if (isConfirmationDisabled() || !navigationContext.shouldPreventNavigation()) {
          return;
        }

        // Show confirmation for gesture navigation
        setPendingNavigation(() => () => {
          isNavigatingRef.current = true;
          window.history.back();
        });
        setShowModal(true);
      }
      
      touchStartX = null;
      touchStartY = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigationContext]);

  // Form state management
  useEffect(() => {
    if (!trackForms || !formId) return;

    navigationContext.registerForm(formId, false);

    return () => {
      navigationContext.unregisterForm(formId);
    };
  }, [trackForms, formId, navigationContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (formId) {
        navigationContext.unregisterForm(formId);
      }
    };
  }, [formId, navigationContext]);

  // Public methods for manual navigation (simplified to avoid circular deps)
  const navigate = useCallback((path) => {
    if (shouldBypass(path) || !navigationContext.shouldPreventNavigation()) {
      router.push(path);
      return;
    }
    setPendingNavigation(() => () => router.push(path));
    setShowModal(true);
  }, [router, shouldBypass, navigationContext]);

  const replace = useCallback((path) => {
    if (shouldBypass(path) || !navigationContext.shouldPreventNavigation()) {
      router.replace(path);
      return;
    }
    setPendingNavigation(() => () => router.replace(path));
    setShowModal(true);
  }, [router, shouldBypass, navigationContext]);

  const back = useCallback(() => {
    if (shouldBypass() || !navigationContext.shouldPreventNavigation()) {
      router.back();
      return;
    }
    setPendingNavigation(() => () => router.back());
    setShowModal(true);
  }, [router, shouldBypass, navigationContext]);

  // Form state helpers
  const markFormDirty = useCallback((dirty = true) => {
    if (formId) {
      navigationContext.updateFormState(formId, dirty);
    }
  }, [formId, navigationContext]);

  const markFormClean = useCallback(() => {
    if (formId) {
      navigationContext.updateFormState(formId, false);
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
    context: navigationContext.getNavigationContext(),
    message: customMessage,
    
    // State
    isProtected: navigationContext.shouldPreventNavigation()
  };
};