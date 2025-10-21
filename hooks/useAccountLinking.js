'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export function useAccountLinking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkAccountLinking = async (email, googleData) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/account-linking/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, googleData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Account linking check failed');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyLinkingOTP = async (email, otp) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/account-linking/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendLinkingOTP = async (email) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/account-linking/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const completeLinking = async (email, selectedData, existingUser, googleData) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/account-linking/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, selectedData, existingUser, googleData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Account linking failed');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInWithLinking = async (callbackUrl) => {
    try {
      setLoading(true);
      setError('');

      const result = await signIn('google', { 
        callbackUrl,
        redirect: false 
      });

      if (result?.error && result.error === 'Callback') {
        // Check URL parameters for account linking info
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const error = urlParams.get('error');
          const email = urlParams.get('email');
          const googleDataStr = urlParams.get('googleData');
          
          if (error === 'AccountLinking' && email && googleDataStr) {
            const googleData = JSON.parse(decodeURIComponent(googleDataStr));
            
            return {
              requiresLinking: true,
              email: decodeURIComponent(email),
              googleData
            };
          }
        }
        
        throw new Error(result.error);
      } else if (result?.error) {
        throw new Error(result.error);
      }

      return { success: true, result };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    setError,
    checkAccountLinking,
    verifyLinkingOTP,
    resendLinkingOTP,
    completeLinking,
    handleGoogleSignInWithLinking
  };
}