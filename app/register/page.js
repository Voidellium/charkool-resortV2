'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SignUpPage() {
  const [form, setForm] = useState({
    email: '', firstName: '', middleName: '', lastName: '',
    birthdate: '', contact: '', password: '', confirm: ''
  });
  const [showRules, setShowRules] = useState(false);

  const passwordRules = [
    { label: 'At least 8 characters', test: p => p.length >= 8 },
    { label: 'Lower case letters (a-z)', test: p => /[a-z]/.test(p) },
    { label: 'Upper case letters (A-Z)', test: p => /[A-Z]/.test(p) },
    { label: 'Numbers (0-9)', test: p => /\d/.test(p) },
    { label: 'Special characters (@#$%^&*!?)', test: p => /[^A-Za-z0-9]/.test(p) },
    { label: 'No more than 2 identical characters in a row', test: p => !/(.)\1\1/.test(p) },
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

  const handleSubmit = e => { e.preventDefault(); };

  return (
    <div className="signup-wrapper">
      <div className="left-panel">
        <Image
          src="/images/logo.png"
          alt="Charkool Logo"
          width={220}
          height={220}
          className="logo-img"
          priority
        />
        <p className="tagline">
          Escape to Paradise at<br />Charkool Leisure Beach Resort
        </p>
      </div>

      <div className="right-panel">
        <h1 className="form-title">Sign Up</h1>
        <form className="signup-form" onSubmit={handleSubmit}>
          <input name="firstName" placeholder="First Name *" value={form.firstName} onChange={handleChange} required />
          <input name="middleName" placeholder="Middle Name (Optional)" value={form.middleName} onChange={handleChange} />
          <input name="lastName" placeholder="Last Name *" value={form.lastName} onChange={handleChange} required />
          <div className="password-wrapper">
            <input
              type="password"
              name="password"
              placeholder="Password *"
              value={form.password}
              onChange={handleChange}
              onFocus={() => setShowRules(true)}
              onBlur={() => setShowRules(false)}
              required
            />
            {showRules && (
              <div className="password-rules" aria-live="polite">
                {passwordRules.map((rule, idx) => (
                  <p key={idx} className={rule.test(form.password) ? 'valid' : 'invalid'}>
                    {rule.test(form.password) ? '✔' : '✖'} {rule.label}
                  </p>
                ))}
              </div>
            )}
          </div>
          <input name="email" type="email" placeholder="Email *" value={form.email} onChange={handleChange} required />
          <input type="date" name="birthdate" value={form.birthdate} onChange={handleChange} placeholder="Birthday *" required />
          <div className="contact-wrapper">
            <span className="prefix">+63</span>
            <input
              name="contact"
              placeholder="10-digit number *"
              value={form.contact}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="primary-btn">Sign Up</button>
        </form>
        <Link href="/forgot-password" className="forgot-link">Forgot Password?</Link>
        <button className="google-btn" type="button">
          Sign Up with Google
        </button>
        <p className="login-text">
          Already have an account? <Link href="/login">Log In</Link>
        </p>
      </div>

      <style jsx global>{`
        html, body, #__next {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          background: linear-gradient(135deg,#fcd34d 0%,#e6f4f8 100%);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>

      <style jsx>{`
        .signup-wrapper {
          display: flex;
          width: 100%;
          max-width: 1150px;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 36px rgba(15,23,42,0.15);
          margin: auto;
        }
        .left-panel {
          flex: 1;
          background: #fff7e6;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2.5rem;
          min-width: 280px;
        }
        .logo-img {
          max-width: 220px;
          width: 100%;
          height: auto;
        }
        .tagline {
          margin-top: 1rem;
          text-align: center;
          color: #374151;
          font-size: 1rem;
          line-height: 1.4;
        }
        .right-panel {
          flex: 1;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #fff;
        }
        .form-title {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 1.2rem;
          text-align: center;
          color: #0f172a;
        }
        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          align-items: center;
        }
        .signup-form input {
          width: 100%;
          max-width: 520px;
          height: 44px;
          padding: 0 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          line-height: 1.2;
          outline: none;
          overflow-x: auto;
          white-space: nowrap;
        }
        .signup-form input:focus {
          box-shadow: 0 0 0 3px rgba(245,158,11,0.12);
          border-color: #f59e0b;
        }
        .password-wrapper {
          position: relative;
          width: 100%;
          max-width: 520px;
        }
        .password-rules {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          margin-top: 0.3rem;
          z-index: 10;
        }
        .password-rules p {
          margin: 0.25rem 0;
        }
        .valid { color: #16a34a; }
        .invalid { color: #dc2626; }
        .contact-wrapper {
          display: flex;
          align-items: center;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
          max-width: 520px;
          height: 44px;
        }
        .prefix {
          padding: 0 12px;
          background: #f3f4f6;
          border-right: 1px solid #e5e7eb;
          font-size: 1rem;
          color: #374151;
          display: flex;
          align-items: center;
          height: 100%;
          white-space: nowrap;
        }
        .contact-wrapper input {
          border: none;
          flex: 1;
          padding: 0 12px;
          font-size: 1rem;
          outline: none;
          height: 100%;
          width: 100%;
        }
        .primary-btn {
          margin-top: 1.1rem;
          padding: 0 14px;
          background-color: #f59e0b;
          color: #fff;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.15s, transform 0.06s;
          width: 100%;
          max-width: 520px;
          height: 44px;
        }
        .primary-btn:hover {
          background-color: #d97706;
          transform: translateY(-1px);
        }
        .forgot-link {
          display: inline-block;
          margin-top: 0.8rem;
          font-size: 0.9rem;
          color: #2563eb;
          text-decoration: none;
        }
        .forgot-link:hover {
          text-decoration: underline;
        }
        .google-btn {
          margin-top: 0.9rem;
          padding: 0 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-size: 1rem;
          cursor: pointer;
          width: 100%;
          max-width: 520px;
          height: 44px;
        }
        .google-btn:hover { background: #f8fafc; }
        .login-text {
          margin-top: 0.9rem;
          text-align: center;
          font-size: 0.9rem;
          color: #374151;
        }
        .login-text a {
          color: #d97706;
          text-decoration: none;
        }
        @media (max-width: 900px) {
          .signup-wrapper {
            flex-direction: column;
            max-width: 95%;
            border-radius: 12px;
          }
          .left-panel, .right-panel {
            padding: 2rem;
          }
          .logo-img {
            max-width: 180px;
          }
          .signup-form input, .contact-wrapper, .primary-btn, .google-btn {
            max-width: 100%;
          }
          .password-wrapper {
            max-width: 100%;
          }
        }
        @media (max-width: 600px) {
          .form-title {
            font-size: 1.5rem;
          }
          .signup-form input, .primary-btn, .google-btn {
            font-size: 0.95rem;
            height: 42px;
            padding: 0 12px;
          }
          .password-rules {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
