'use client';
import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { generateBrowserFingerprint } from '../../src/lib/browser-fingerprint';

function VerifyOTPContent() {
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const otpRefs = useRef([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();

  const redirectUrl = searchParams.get('redirect') || '/guest/dashboard';

  // Debug logging
  useEffect(() => {
    console.log('[VERIFY-OTP] Status:', status);
    console.log('[VERIFY-OTP] Session:', session);
    console.log('[VERIFY-OTP] Redirect URL:', redirectUrl);
  }, [status, session, redirectUrl]);

  // Define handleSendOTP with useCallback before it's used in useEffect
  const handleSendOTP = useCallback(async (showAlert = true) => {
    setError('');
    setResendLoading(true);

    try {
      // Get or generate browser fingerprint
      let browserFingerprint = sessionStorage.getItem('browserFingerprint');
      if (!browserFingerprint) {
        browserFingerprint = generateBrowserFingerprint();
        sessionStorage.setItem('browserFingerprint', browserFingerprint);
      }
      const userAgentInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };

      const response = await fetch('/api/send-session-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          browserFingerprint,
          userAgent: userAgentInfo.userAgent
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        if (showAlert) {
          alert('OTP sent successfully! Please check your email.');
        }
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('[VERIFY-OTP] Unauthenticated, redirecting to login');
      const timer = setTimeout(() => {
        router.push('/login');
      }, 1000); // Give session a moment to load
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  useEffect(() => {
    otpRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && !otpRequested) {
      console.log('[VERIFY-OTP] Authenticated, sending OTP');
      // Generate browser fingerprint if not already present
      let browserFingerprint = sessionStorage.getItem('browserFingerprint');
      if (!browserFingerprint) {
        browserFingerprint = generateBrowserFingerprint();
        sessionStorage.setItem('browserFingerprint', browserFingerprint);
      }
      // Auto-send OTP
      handleSendOTP(false);
      setOtpRequested(true);
    }
  }, [status, otpRequested, handleSendOTP]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const otp = otpDigits.join('');

    try {
      // Get or generate browser fingerprint
      let browserFingerprint = sessionStorage.getItem('browserFingerprint');
      if (!browserFingerprint) {
        browserFingerprint = generateBrowserFingerprint();
        sessionStorage.setItem('browserFingerprint', browserFingerprint);
      }
      const userAgentInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };

      const response = await fetch('/api/verify-session-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otp,
          browserFingerprint,
          userAgent: userAgentInfo.userAgent
        }),
      });

      const data = await response.json();

      if (response.ok) {
        try {
          // OTP verified successfully, now update the session to set the trusted flag
          await update({ trigger: "otpVerified" });
          // Determine final redirect URL
          let finalRedirect = redirectUrl;
          if (finalRedirect === '/guest/dashboard') {
            // Fallback to role-based redirect if default is used
            const role = data.user.role.toLowerCase();
            switch (role) {
              case 'superadmin':
                finalRedirect = '/super-admin/dashboard';
                break;
              case 'receptionist':
                finalRedirect = '/receptionist';
                break;
              case 'cashier':
                finalRedirect = '/cashier';
                break;
              case 'amenityinventorymanager':
                finalRedirect = '/amenityinventorymanager/dashboard';
                break;
              default:
                finalRedirect = '/guest/dashboard';
            }
          }
          // Now, redirect to the intended page
          router.push(finalRedirect);
        } catch (updateError) {
          console.error('Session update error:', updateError);
          setError('Session update failed. Please try again.');
        }
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    handleSendOTP(true);
  };

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');

    if (!cleaned) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    if (cleaned.length === 1) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = cleaned;
        return next;
      });

      if (index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
      return;
    }

    // Support typing/pasting multiple digits at once.
    setOtpDigits((prev) => {
      const next = [...prev];
      cleaned.slice(0, 6 - index).split('').forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      return next;
    });

    const lastIndex = Math.min(index + cleaned.length - 1, 5);
    otpRefs.current[lastIndex]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();

      if (otpDigits[index]) {
        setOtpDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
        return;
      }

      if (index > 0) {
        setOtpDigits((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
        otpRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (index, e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) {
      return;
    }

    e.preventDefault();
    setOtpDigits((prev) => {
      const next = [...prev];
      pasted.slice(0, 6 - index).split('').forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      return next;
    });

    const lastIndex = Math.min(index + pasted.length - 1, 5);
    otpRefs.current[lastIndex]?.focus();
  };

  if (status === 'loading') {
    console.log('[VERIFY-OTP] Rendering loading state');
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Loading session...</div>
        </div>
        <style jsx>{`
          .container {
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
          }
          .loading {
            padding: 2rem;
            text-align: center;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // Don't return null, show a message before redirect
    console.log('[VERIFY-OTP] Rendering unauthenticated state');
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Redirecting to login...</div>
        </div>
        <style jsx>{`
          .container {
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
          }
          .loading {
            padding: 2rem;
            text-align: center;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  console.log('[VERIFY-OTP] Rendering main form, otpSent:', otpSent);
  return (
    <div className="container">
      <div className="card">
        <div className="content">
          <h2 className="title">Verify Your Identity</h2>
          <p className="description">
            {otpSent ? 'OTP sent to your email. Please enter the code below.' : 'For security purposes, please enter the OTP sent to your email to access this section.'}
          </p>

          <form onSubmit={handleSubmit} className="form">
            <div className="input-group">
              <label htmlFor="otp-0">Enter OTP</label>
              <div className="otp-boxes">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    pattern="[0-9]*"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={(e) => handleOtpPaste(index, e)}
                    className="otp-box"
                    aria-label={`OTP digit ${index + 1}`}
                    required
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="verify-button"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          {error && <p className="error-message">{error}</p>}

          <div className="resend-section">
            <p>{otpSent ? 'Need another code?' : 'Did not receive the OTP?'}</p>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendLoading}
              className="resend-button"
            >
              {resendLoading ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>

          <div className="back-link">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="back-button"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%);
          padding: 1rem;
        }

        .card {
          width: 100%;
          max-width: 400px;
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .content {
          padding: 2rem;
          text-align: center;
        }

        .title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #1f2937;
        }

        .description {
          color: #6b7280;
          margin-bottom: 2rem;
          line-height: 1.5;
        }

        .developer-hint {
          background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
          border: 2px solid #f59e0b;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          color: #78350f;
          font-size: 0.875rem;
          text-align: left;
        }

        .developer-hint code {
          background: #fef3c7;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-weight: 700;
          color: #b45309;
          font-family: 'Courier New', monospace;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          text-align: left;
        }

        .input-group label {
          font-weight: 500;
          color: #374151;
        }

        .otp-boxes {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.5rem;
          width: 100%;
        }

        .otp-box {
          width: 100%;
          height: 3rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1.125rem;
          text-align: center;
          font-weight: 600;
          font-family: 'Courier New', monospace;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .otp-box:focus {
          outline: none;
          border-color: #FEBE52;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .verify-button {
          width: 100%;
          min-height: 3rem;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 0.375rem;
          background-color: #FEBE52;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .verify-button:hover:not(:disabled) {
          background-color: #F0790C;
        }

        .verify-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.875rem;
          margin-top: 1rem;
        }

        .resend-section {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .resend-section p {
          margin: 0 0 0.5rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .resend-button {
          background: none;
          border: none;
          color: #0ea5e9;
          font-weight: 500;
          cursor: pointer;
          text-decoration: underline;
        }

        .resend-button:hover:not(:disabled) {
          color: #0284c7;
        }

        .resend-button:disabled {
          color: #9ca3af;
          cursor: not-allowed;
        }

        .back-link {
          margin-top: 1rem;
        }

        .back-link a {
          color: #6b7280;
          text-decoration: none;
          font-size: 0.875rem;
        }

        .back-link a:hover {
          color: #374151;
        }

        .back-button {
          background: none;
          border: none;
          color: #6b7280;
          text-decoration: none;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0;
        }

        .back-button:hover {
          color: #374151;
        }

        .loading {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        @media (max-width: 480px) {
          .content {
            padding: 1.5rem;
          }

          .otp-boxes {
            gap: 0.4rem;
          }

          .otp-box {
            font-size: 1rem;
            height: 2.75rem;
          }
        }
      `}</style>
    </div>
  );
}

// Main export with Suspense wrapper
export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
