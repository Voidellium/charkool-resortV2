'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa6';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    email: '', firstName: '', middleName: '', lastName: '',
    birthdate: '', contact: '', password: '', confirm: ''
  });
  const [showRules, setShowRules] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const passwordRules = [
    { label: 'At least 8 characters', test: p => p.length >= 8 },
    { label: 'Lower case letters (a-z)', test: p => /[a-z]/.test(p) },
    { label: 'Upper case letters (A-Z)', test: p => /[A-Z]/.test(p) },
    { label: 'Numbers (0-9)', test: p => /\d/.test(p) },
    { label: 'Special characters (@#$%^&*!?)', test: p => /[^A-Za-z0-9]/.test(p) },
    { label: 'No more than 2 identical characters in a row', test: p => !(/(.)\1\1/.test(p)) },
    { label: 'Contains at least 3 different character types', test: p => {
        let types = 0;
        if (/[a-z]/.test(p)) types++;
        if (/[A-Z]/.test(p)) types++;
        if (/\d/.test(p)) types++;
        if (/[^A-Za-z0-9]/.test(p)) types++;
        return types >= 3;
      }
    },
    { label: 'Password must not be common', test: p => !['password','123456','qwerty'].includes(p.toLowerCase()) }
  ];

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'contact') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      setForm({ ...form, contact: cleaned });
      return;
    }
    setForm({ ...form, [name]: value });
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    try {
      const res = await fetch('/api/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');
      setCountdown(60);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!showOTPInput) {
        if (!form.contact || form.contact.length !== 10 || !form.contact.startsWith('9')) {
          throw new Error('Please enter a valid 10-digit number starting with 9');
        }
        if (form.password !== form.confirm) {
          throw new Error('Passwords do not match');
        }
        for (const rule of passwordRules) {
          if (!rule.test(form.password)) {
            throw new Error(`Password validation failed: ${rule.label}`);
          }
        }
        const birthDate = new Date(form.birthdate);
        const today = new Date();
        const minBirthDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
        if (birthDate > minBirthDate) {
          throw new Error('You must be at least 16 years old to create an account');
        }

        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: form.firstName,
            middleName: form.middleName,
            lastName: form.lastName,
            birthdate: form.birthdate,
            contactNumber: '63' + form.contact,
            email: form.email,
            password: form.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        setShowOTPInput(true);
        setCountdown(60);
      } else {
        const verifyRes = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, otp }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'OTP verification failed');

        const result = await signIn('credentials', {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        if (result?.error) throw new Error(result.error);

        router.push('/guest/dashboard');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 16);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <>
      <div className="page-container">
        <div className="signup-wrapper">
        <div className="left-panel">
          <Image
            src="/images/logo.png"
            alt="Charkool Logo"
            width={280}
            height={280}
            className="logo-img"
            style={{ objectFit: 'contain', aspectRatio: '1 / 1', width: '280px', height: '280px', borderRadius: '20px' }}
            priority
          />
          <p className="tagline">
            Escape to Paradise at<br />Charkool Leisure Beach Resort
          </p>
        </div>

        <div className="right-panel">
          <div className="form-card">
            <h1 className="form-title">Create Your Account</h1>

            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="input-grid">
                <input name="firstName" placeholder="First Name *" value={form.firstName} onChange={handleChange} required />
                <input name="middleName" placeholder="Middle Name (Optional)" value={form.middleName} onChange={handleChange} />
                <input name="lastName" placeholder="Last Name *" value={form.lastName} onChange={handleChange} required />
              </div>

              <input
                type="date"
                id="birthdate"
                name="birthdate"
                value={form.birthdate}
                onChange={handleChange}
                required
                max={maxDateStr}
                className="birthdate-input"
                placeholder="Your Birthday mm/dd/yyyy"
              />

              <div className="contact-wrapper">
                <span className="prefix">+63</span>
                <input
                  name="contact"
                  placeholder="10-digit number (9XXXXXXXXX) *"
                  value={form.contact}
                  onChange={handleChange}
                  pattern="[9][0-9]{9}"
                  required
                />
              </div>

              <input name="email" type="email" placeholder="Email *" value={form.email} onChange={handleChange} required />

              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password *"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setShowRules(true)}
                  onBlur={() => setShowRules(false)}
                  required
                />
                <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
                {showRules && (
                  <div className="password-rules">
                    {passwordRules.map((rule, idx) => (
                      <p key={idx} className={rule.test(form.password) ? 'valid' : 'invalid'}>
                        {rule.test(form.password) ? '✔' : '✖'} {rule.label}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="password-wrapper">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm"
                  placeholder="Confirm Password *"
                  value={form.confirm}
                  onChange={handleChange}
                  required
                />
                <button type="button" className="toggle-btn" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>

              {showOTPInput && (
                <div className="otp-input-container">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                  />
                  <p className="otp-hint">An OTP has been sent to your email address</p>
                  {countdown > 0 ? (
                    <p className="otp-countdown">You can request a new OTP in {countdown}s</p>
                  ) : (
                    <>
                      <p className="otp-retry">You did not receive any OTP? Try again.</p>
                      <button type="button" className="resend-btn" onClick={handleResendOTP}>Resend OTP</button>
                    </>
                  )}
                </div>
              )}

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : (showOTPInput ? 'Verify OTP' : 'Sign Up')}
              </button>
            </form>

            <button 
              className="google-btn" 
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/guest/dashboard' })}
            >
              <FaGoogle style={{ marginRight: 8 }} /> Sign Up with Google
            </button>

            <p className="login-text">
              Already have an account? <Link href="/login">Log In</Link>
            </p>
          </div>
        </div>
      </div>
      </div>

      <footer className="footer">
        <div className="footer-line"></div>
        <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
      </footer>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(120deg,#fcd34d 0%,#fef3c7 30%,#e6f4f8 100%);
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
        }
        .navbar {
          height: 80px !important;
          min-height: 80px !important;
          max-height: 80px !important;
        }
      `}</style>

      <style jsx>{`
        .page-container {
          min-height: calc(100vh - 80px);
          padding: 2rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .signup-wrapper {
          display: flex;
          width: 100%;
          max-width: 1400px;
          min-height: 90vh;
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
        }
        .left-panel {
          flex: 1.1;
          background: linear-gradient(160deg,#fff7e6,#fff);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3rem;
        }
        .logo-img { max-width: 220px; width: 100%; height: auto; }
        .tagline {
          margin-top: 1.2rem;
          text-align: center;
          color: #374151;
          font-size: 1.1rem;
          font-weight: 500;
        }
        .right-panel {
          flex: 1.5;
          background: #fafafa;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 3rem;
        }
        .form-card {
          background: #fff;
          width: 100%;
          max-width: 600px;
          padding: 2.5rem;
          border-radius: 16px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
        }
        .form-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          text-align: center;
          color: #0f172a;
        }
        .input-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.8rem;
          width: 100%;
        }
        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
        }
        .signup-form input {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          transition: border 0.2s, box-shadow 0.2s;
        }
        .signup-form input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.15);
        }
        .birthdate-input::placeholder {
          font-size: 0.95rem;
          color: #9ca3af;
        }
        .password-wrapper {
          position: relative;
          width: 100%;
        }
        .toggle-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #f59e0b;
          font-weight: 600;
          cursor: pointer;
        }
        .password-rules {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0.75rem;
          font-size: 0.85rem;
          margin-top: 0.4rem;
          z-index: 10;
        }
        .valid { color: #16a34a; }
        .invalid { color: #dc2626; }
        .contact-wrapper {
          display: flex;
          align-items: center;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          width: 100%;
          height: 48px;
        }
        .prefix {
          padding: 0 12px;
          background: #f3f4f6;
          border-right: 1px solid #e5e7eb;
          color: #374151;
        }
        .contact-wrapper input {
          border: none;
          flex: 1;
          padding: 0 12px;
          font-size: 1rem;
          outline: none;
          height: 100%;
        }
        .error-message {
          color: #dc2626;
          font-size: 0.9rem;
          text-align: center;
        }
        .otp-input-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
        }
        .otp-hint {
          font-size: 0.85rem;
          color: #4b5563;
        }
        .otp-countdown {
          font-size: 0.9rem;
          color: #374151;
        }
        .otp-retry {
          font-size: 0.9rem;
          color: #374151;
        }
        .resend-btn {
          margin-top: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          background: #f59e0b;
          color: #fff;
          border-radius: 8px;
          cursor: pointer;
        }
        .resend-btn:hover { background: #d97706; }
        .primary-btn {
          width: 100%;
          height: 48px;
          background: #f59e0b;
          color: #fff;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          margin-top: 1rem;
          transition: background 0.3s;
        }
        .primary-btn:hover { background: #d97706; }
        .google-btn {
          margin-top: 1rem;
          width: 100%;
          height: 48px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-weight: 500;
        }
        .google-btn:hover { background: #f8fafc; }
        .login-text {
          margin-top: 1rem;
          text-align: center;
          font-size: 0.95rem;
          color: #374151;
        }
        .login-text a { color: #d97706; font-weight: 600; }
        .footer {
          background-color: #e8cfa3;
          text-align: center;
          padding: 1.5rem 0;
          color: #123238;
          font-size: 0.95rem;
          margin-top: 2rem;
        }
        .footer-line {
          .footer {
          background-color: #e8cfa3;
          text-align: center;
          padding: 1.5rem 0;
          color: rgba(18, 50, 56, 0.85);
          font-size: 0.9rem;
        }
        @media (max-width: 1024px) {
          .signup-wrapper { flex-direction: column; max-width: 95%; }
          .left-panel { padding: 2rem; }
          .form-card { padding: 2rem; }
          .input-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .form-title { font-size: 1.6rem; }
          .signup-form input, .primary-btn, .google-btn { font-size: 0.95rem; height: 44px; }
          .password-rules { font-size: 0.8rem; }
        }
      `}</style>
    </>
  );
}
