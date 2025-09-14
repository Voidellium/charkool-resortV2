'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // For now, just simulate success
    setSubmitted(true);
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Forgot Password</h2>
        {!submitted ? (
          <form onSubmit={handleSubmit} className="form-content">
            <label htmlFor="email">Enter your email address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="submit-button">Send Reset Link</button>
          </form>
        ) : (
          <p className="success-message">
            If an account with that email exists, a password reset link has been sent.
          </p>
        )}
        <Link href="/login" className="back-link">Back to Login</Link>

      </div>

      <style jsx>{`
        .container {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          background-color: #e2e8f0;
          padding: 1rem;
        }
        .card {
          background: white;
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
          background-color: #0ea5e9;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-button:hover {
          background-color: #0284c7;
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
