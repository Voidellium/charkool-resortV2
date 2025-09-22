'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { generateBrowserFingerprint, getUserAgentInfo, isIncognitoMode } from '../src/lib/browser-fingerprint';

export default function BrowserFingerprintProvider({ children }) {
  const { data: session, status } = useSession();
  const [fingerprint, setFingerprint] = useState(null);
  const [isIncognito, setIsIncognito] = useState(false);

  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        // Check if in incognito mode
        const incognito = await isIncognitoMode();
        setIsIncognito(incognito);

        // Generate browser fingerprint
        const fp = generateBrowserFingerprint();
        setFingerprint(fp);

        // Store fingerprint in sessionStorage for reuse
        sessionStorage.setItem('browserFingerprint', fp);

        // If user is authenticated and not in incognito, register this browser
        // Apply to ALL authenticated users (including guests)
        if (session?.user && !incognito) {
          const userAgentInfo = getUserAgentInfo();

          // Register browser as trusted
          await fetch('/api/trusted-browsers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              browserFingerprint: fp,
              userAgent: userAgentInfo.userAgent,
              ipAddress: 'client-side', // Will be set by server
            }),
          });
        }
      } catch (error) {
        console.error('Browser fingerprint initialization error:', error);
      }
    };

    initializeFingerprint();
  }, [session]);

  // Add fingerprint and incognito status to headers for API calls
  useEffect(() => {
    if (fingerprint && session) {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const [resource, options = {}] = args;

        // The first argument to fetch can be a URL string or a Request object.
        const urlString = typeof resource === 'string' ? resource : resource?.url;

        // Add browser fingerprint and incognito status to headers for our API calls
        if (urlString && urlString.startsWith(window.location.origin) && !urlString.includes('/api/auth/')) {
          const headers = new Headers(options.headers);
          headers.set('x-browser-fingerprint', fingerprint);
          headers.set('x-is-incognito', isIncognito.toString());
          options.headers = headers;
        }

        return originalFetch(resource, options);
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [fingerprint, session, isIncognito]);

  return children;
}
