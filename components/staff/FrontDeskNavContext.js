'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const defaults = {
  operationalBadgeCount: 0,
  onOperationalNotificationsClick: null,
  showShiftSummary: false,
  onShiftSummary: null,
};

const FrontDeskNavContext = createContext(null);

export function FrontDeskNavProvider({ children }) {
  const [navState, setNavState] = useState(defaults);

  const setNavExtras = useCallback((extras) => {
    setNavState((prev) => ({ ...prev, ...extras }));
  }, []);

  const value = useMemo(
    () => ({ ...navState, setNavExtras }),
    [navState, setNavExtras]
  );

  return (
    <FrontDeskNavContext.Provider value={value}>
      {children}
    </FrontDeskNavContext.Provider>
  );
}

export function useFrontDeskNav() {
  const ctx = useContext(FrontDeskNavContext);
  if (!ctx) {
    return { ...defaults, setNavExtras: () => {} };
  }
  return ctx;
}
