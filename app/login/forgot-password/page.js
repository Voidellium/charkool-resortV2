'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // email, otp, newPassword
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep('otp');
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep('newPassword');
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setResendLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Reset code sent successfully! Please check your email.');
      } else {
        setError(data.message || 'Failed to send reset code');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/login?message=Password reset successful');
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <Image src="/images/logo.png" alt="Charkool Logo" width={150} height={150} className="logo-img"/>
          <p className="tagline">Escape to Paradise at<br/>Charkool Leisure Beach Resort</p>
        </div>
        <div className="login-right">
          <h2 className="login-title">Reset Password</h2>
          {error && <p className="error-message">{error}</p>}

          {step === 'email' && (
            <form onSubmit={handleRequestReset} className="login-form" noValidate>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={loading} className="submit-button">
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="login-form" noValidate>
              <label>
                Enter Reset Code
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                />
              </label>
              <button type="submit" disabled={loading} className="submit-button">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <div className="resend-section">
              <p>Didn't receive the code?</p>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendLoading}
                className="resend-button"
              >
                {resendLoading ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          )}

          {step === 'newPassword' && (
            <form onSubmit={handleResetPassword} className="login-form" noValidate>
              <label>
                New Password
                <div className="password-box">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="toggle-eye"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </label>
              <label>
                Confirm Password
                <div className="password-box">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </label>
              <button type="submit" disabled={loading} className="submit-button">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <Link href="/login" className="forgot-password-link">Back to Login</Link>
        </div>
      </div>

      <style jsx>{`
        .login-wrapper {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          background-color: #f0f2f5;
          padding: 1rem;
        }
        .login-card {
          display: flex;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          width: 100%;
          max-width: 900px;
          min-height: 500px;
        }
        .login-left {
          flex: 1;
          background: linear-gradient(135deg, #fcd34d 36%, #e6f4f8 100%);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
        }
        .login-right {
          flex: 1;
          padding: 2rem;
          display: flex;
          flex-direction: column;
        }
        .logo-img {
          margin-bottom: 1rem;
        }
        .tagline {
          font-size: 1.25rem;
          line-height: 1.75rem;
          margin-top: 1rem;
        }
        .login-title {
          font-size: 1.875rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 2rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .login-form label {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-weight: 500;
          color: #475569;
        }
        .login-form input {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .login-form input:focus {
          border-color: #FEBE52;
        }
        .submit-button {
          background: #FEBE52;
          color: white;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }
        .submit-button:hover {
          background: #DBA90F;
        }
        .submit-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }
        .error-message {
          color: #dc2626;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background: #fef2f2;
          border-radius: 0.375rem;
        }
        .forgot-password-link {
          margin-top: 1rem;
          text-align: center;
          color: #0ea5e9;
          text-decoration: none;
        }
        .forgot-password-link:hover {
          text-decoration: underline;
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
        .password-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .password-box input {
          width: 100%;
          padding-right: 2.5rem;
        }
        .toggle-eye {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 0;
        }
        @media (max-width: 768px) {
          .login-card {
            flex-direction: column;
            max-width: 400px;
          }
          .login-left {
            padding: 1.5rem;
          }
          .login-right {
            padding: 1.5rem;
          }
        }
        }
          padding: 2rem;
          border-radius: 0.5rem;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          text-align: center;
        }
        h2 {
          margin-bottom: 1rem;
          font-weight: 700;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        label {
          font-weight: 500;
          font-size: 0.9rem;
          text-align: left;
        }
        input {
          padding: 0.5rem 0.75rem;
          font-size: 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
        }
        .submit-button {
          background-color: #FEBE52;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-button:hover {
          background-color: #DBA90F;
        }
        .success-message {
          color: #16a34a;
          font-weight: 600;
        }
        .back-link {
          display: block;
          margin-top: 1rem;
          color: #0c4a6e;
          text-decoration: none;
          font-weight: 500;
        }
        .back-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
