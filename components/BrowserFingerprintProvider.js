'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { generateBrowserFingerprint, getUserAgentInfo } from '../src/lib/browser-fingerprint';

export default function BrowserFingerprintProvider({ children }) {
  const { data: session, status } = useSession();
  const [fingerprint, setFingerprint] = useState(null);
  const [isIncognito, setIsIncognito] = useState(false);

  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        // Check if in incognito mode
        const incognito = await generateBrowserFingerprint.isIncognitoMode();
        setIsIncognito(incognito);

        // Generate browser fingerprint
        const fp = generateBrowserFingerprint();
        setFingerprint(fp);

        // Store fingerprint in sessionStorage for reuse
        sessionStorage.setItem('browserFingerprint', fp);

        // If user is authenticated and not in incognito, register this browser
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

  // Add fingerprint to headers for API calls
  useEffect(() => {
    if (fingerprint && session) {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const [url, options = {}] = args;

        // Add browser fingerprint to headers for our API calls
        if (url.startsWith(window.location.origin) && !url.includes('/api/auth/')) {
          const headers = new Headers(options.headers);
          headers.set('x-browser-fingerprint', fingerprint);
          options.headers = headers;
        }

        return originalFetch(url, options);
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [fingerprint, session]);

  return children;
}
