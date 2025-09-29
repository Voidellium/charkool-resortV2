'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { generateBrowserFingerprint } from '../../src/lib/browser-fingerprint';

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const otpRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const redirectUrl = searchParams.get('redirect') || '/guest/dashboard';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (otpRef.current) {
      otpRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      // Generate browser fingerprint if not already present
      let browserFingerprint = sessionStorage.getItem('browserFingerprint');
      if (!browserFingerprint) {
        browserFingerprint = generateBrowserFingerprint();
        sessionStorage.setItem('browserFingerprint', browserFingerprint);
      }
      // Auto-send OTP
      handleSendOTP(false);
    }
  }, [status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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
        // OTP verified successfully, redirect to intended page
        window.location.href = redirectUrl;
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

  const handleSendOTP = async (showAlert = true) => {
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
  };

  const handleResendOTP = async () => {
    handleSendOTP(true);
  };

  if (status === 'loading') {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect to login
  }

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
              <label htmlFor="otp">Enter OTP</label>
              <input
                ref={otpRef}
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                className="otp-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
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

        .form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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

        .otp-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1.125rem;
          text-align: center;
          letter-spacing: 0.5rem;
          font-weight: 600;
        }

        .otp-input:focus {
          outline: none;
          border-color: #FEBE52;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .verify-button {
          width: 100%;
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
      `}</style>
    </div>
  );
}
