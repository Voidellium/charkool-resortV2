'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield } from 'lucide-react';
import ClientNavbarWrapper from '../../../components/ClientNavbarWrapper';
import Footer from '../../../components/Footer';


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
  const [countdown, setCountdown] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic email validation
    if (!email || !email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      console.log('Sending reset request for email:', email.trim().toLowerCase());
      
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      console.log('API Response:', data);

      if (res.ok) {
        // Check if there's a warning about email service configuration
        if (data.warning) {
          console.warn('Email service warning:', data.warning);
          setError('Email service is not configured. Please contact administrator.');
          setLoading(false);
          return;
        }
        
        setStep('otp');
        setCountdown(60); // Start 60-second countdown
        setSuccessMessage('Reset code sent to your email successfully!');
        setTimeout(() => setSuccessMessage(''), 5000); // Clear success message after 5 seconds
      } else {
        console.error('API Error:', data);
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
        setSuccessMessage(''); // Clear success message when moving to next step
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
      console.log('Resending OTP for email:', email.trim().toLowerCase());
      
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      console.log('Resend API Response:', data);

      if (res.ok) {
        // Check if there's a warning about email service configuration
        if (data.warning) {
          console.warn('Resend email service warning:', data.warning);
          setError('Email service is not configured. Please contact administrator.');
          setResendLoading(false);
          return;
        }
        
        setCountdown(60); // Restart countdown
        setSuccessMessage('Reset code resent successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        console.error('Resend API Error:', data);
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
    <div>
      <ClientNavbarWrapper />
      <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <Image src="/images/logo.png" alt="Charkool Logo" width={180} height={180} className="logo-img"/>
          <p className="tagline">Escape to Paradise at<br/>Charkool Leisure Beach Resort</p>
        </div>
        <div className="login-right">
          <h2 className="login-title">Reset Password</h2>
          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          {step === 'email' && (
            <form onSubmit={handleRequestReset} className="login-form" noValidate>
              <label>
                Email
                <div className="input-with-icon">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(''); // Clear any existing errors when user types
                      setSuccessMessage(''); // Clear success message when user changes email
                    }}
                    required
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </div>
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
                <div className="input-with-icon">
                  <Shield className="input-icon" size={18} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                      setOtp(value);
                      setError(''); // Clear error when user types
                    }}
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    autoFocus
                  />
                </div>
              </label>
              <button type="submit" disabled={loading || otp.length !== 6} className="submit-button">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <div className="resend-section">
              <p>Didn't receive the code?</p>
              {countdown > 0 ? (
                <p className="countdown-text">Resend available in {countdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                  className="resend-button"
                >
                  {resendLoading ? 'Sending...' : 'Resend Code'}
                </button>
              )}
            </div>
          )}

          {step === 'newPassword' && (
            <form onSubmit={handleResetPassword} className="login-form" noValidate>
              <label>
                New Password
                <div className="input-with-icon password-box">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Enter new password"
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
                <div className="input-with-icon">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Confirm new password"
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
      </div>
      <Footer />

      <style jsx>{`
        .login-wrapper {
          display: flex;
          min-height: calc(100vh - 200px);
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f0f2f5 0%, #e6f4f8 100%);
          padding: 2rem 1rem;
          margin-top: 0;
        }
        .login-card {
          display: flex;
          background: white;
          border-radius: 15px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          overflow: hidden;
          width: 100%;
          max-width: 900px;
          min-height: 500px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .login-left {
          flex: 1;
          background: linear-gradient(135deg, #f59e0b 0%, #fcd34d 50%, #e6f4f8 100%);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .login-left::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite;
        }
        .login-right {
          flex: 1;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
          position: relative;
        }
        .logo-img {
          width: 180px;
          height: auto;
          object-fit: contain;
          margin-bottom: 0.75rem;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
          z-index: 1;
          position: relative;
          transition: transform 0.3s ease;
        }
        .logo-img:hover {
          transform: scale(1.05);
        }
        .tagline {
          font-size: 1.1rem;
          line-height: 1.6rem;
          margin-top: 0.75rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          font-weight: 500;
          z-index: 1;
          position: relative;
        }
        .login-title {
          font-size: 1.65rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1.5rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .login-form label {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          font-weight: 500;
          color: #475569;
          font-size: 0.85rem;
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          transition: all 0.2s ease;
        }
        .input-with-icon:focus-within {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }
        .input-icon {
          padding: 0 12px;
          color: #64748b;
          pointer-events: none;
          user-select: none;
          transition: color 0.2s ease;
          flex-shrink: 0;
        }
        .input-with-icon:focus-within .input-icon {
          color: #f59e0b;
        }
        .login-form input {
          padding: 0.75rem;
          border: none;
          border-radius: 0;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.2s ease;
          width: 100%;
          font-weight: 400;
          background: transparent;
          box-sizing: border-box;
          height: 42px;
        }
        .login-form input::placeholder {
          color: #9ca3af;
        }
        .password-box input {
          padding-right: 3rem;
        }
        .submit-button {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 0.875rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
          font-size: 1rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }
        .submit-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }
        .submit-button:hover::before {
          left: 100%;
        }
        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
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
        .success-message {
          color: #059669;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background: #f0fdf4;
          border-radius: 0.375rem;
          border: 1px solid #bbf7d0;
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
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }
        .resend-section p {
          margin: 0 0 0.4rem 0;
          color: #6b7280;
          font-size: 0.8rem;
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
        .countdown-text {
          color: #64748b;
          font-size: 0.85rem;
          margin: 0.5rem 0;
          font-weight: 500;
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
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: color 0.2s ease;
        }
        .toggle-eye:hover {
          color: #FEBE52;
        }
        @media (max-width: 768px) {
          .login-card {
            flex-direction: column;
            max-width: 420px;
          }
          .login-left {
            padding: 1.25rem;
          }
          .login-right {
            padding: 1.25rem;
          }
          .login-title {
            font-size: 1.4rem;
            margin-bottom: 1.2rem;
          }
          .login-form {
            gap: 0.8rem;
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        /* Enhance page transitions */
        .login-wrapper {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          height: 44px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }
        .submit-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
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
