'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { FaGoogle } from 'react-icons/fa6';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Empty field check
    if (!trimmedName || !trimmedEmail || !password || !confirm) {
      setError("All fields are required.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;
    if (!passwordRegex.test(password)) {
      setError("Password must contain at least 1 capital letter and 1 number.");
      return;
    }

    // Confirm password
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch(`/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/guest/dashboard');
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong.');
    }
  };

  const handleOAuthRegister = (provider) => {
    signIn(provider, { callbackUrl: '/guest/dashboard' });
  };

  return (
    <div className="container">
      <div className="card">
        {/* Left Side - Logo and Tagline */}
        <div className="left-column">
          <Image
            src="/images/logo.png"
            alt="Charkool Leisure Beach Resort Logo"
            width={300}
            height={300}
            style={{ objectFit: 'contain' }}
          />
          <p className="tagline">
            Escape to Paradise at<br />
            Charkool Leisure Beach Resort
          </p>
        </div>

        {/* Right Side - Registration Form */}
        <div className="right-column">
          <h2 className="title">Sign Up</h2>

          <form onSubmit={handleSubmit} className="form-content">
            {/* Email */}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  setIsValidEmail(emailRegex.test(e.target.value));
                }}
                required
              />
              {!isValidEmail && (
                <span className="error-text">
                  Please enter a valid email address.
                </span>
              )}
            </div>
            
            {/* Full Name / Username */}
            <div className="input-group">
              <label htmlFor="name">Username</label> {/* Changed to Username for consistency with the image */}
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                required
              />
            </div>

            {/* Password */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                  className="password-field"
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                  required
                />
                <span
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="password-toggle"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              className="signup-button"
            >
              Sign Up
            </button>
          </form>

          {/* Error Message */}
          {error && <p className="error-message">{error}</p>}

          {/* Google Login */}
          <div className="social-login">
            <button
              type="button"
              onClick={() => handleOAuthRegister('google')}
              className="google-button"
            >
              <FaGoogle />
              <span>Sign Up with Google</span>
            </button>
          </div>

          {/* Login Link */}
          <div className="login-link">
            Already have an account?{' '}
            <Link href="/login">
              Log In
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          background-color: #e2e8f0; /* bg-sky-200 equivalent */
          padding: 1rem;
        }

        .card {
          display: flex;
          width: 100%;
          max-width: 960px; /* max-w-4xl equivalent */
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }

        .left-column {
          display: none; /* Hidden on mobile */
          padding: 2.5rem;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-right: 1px solid #d1d5db; /* border-gray-300 equivalent */
        }
        
        @media (min-width: 768px) { /* md:flex equivalent */
          .left-column {
            display: flex;
          }
        }

        .tagline {
          margin-top: 1rem;
          font-size: 0.875rem; /* text-sm equivalent */
          line-height: 1.25rem;
          color: #4b5563; /* text-gray-600 equivalent */
        }

        .right-column {
          flex: 1;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background-color: white;
        }

        .title {
          font-size: 1.5rem; /* text-2xl equivalent */
          font-weight: 700;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .form-content {
          display: flex;
          flex-direction: column;
          gap: 1rem; /* space-y-6 equivalent */
        }

        .input-group {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .input-group label {
          font-size: 0.75rem; /* text-xs equivalent */
          font-weight: 500;
          color: #4b5563; /* text-gray-700 equivalent */
        }

        .input-group input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .password-input {
          position: relative;
        }

        .password-input input {
          padding-right: 2.5rem;
        }
        
        .password-field {
          width: 70%;
        }

        .password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          color: #9ca3af; /* text-gray-400 equivalent */
        }

        .error-text {
          color: #dc2626; /* text-red-600 equivalent */
          font-size: 0.75rem;
          margin-top: 0.25rem;
          display: block;
        }

        .signup-button {
          width: 100%;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          font-weight: 600;
          color: white;
          background-color: #0ea5e9; /* bg-sky-500 equivalent */
          border: none;
          cursor: pointer;
        }
        
        .signup-button:hover {
          background-color: #0284c7; /* hover:bg-sky-600 equivalent */
        }

        .error-message {
          margin-top: 1rem;
          text-align: center;
          font-size: 0.75rem;
          color: #dc2626; /* text-red-600 equivalent */
        }

        .social-login {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .google-button {
          width: 100%;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.25rem;
          background-color: #DB4437; /* Google Red */
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: 600;
        }
        
        .google-button:hover {
          background-color: #a33224; /* Darker Google Red */
        }
        
        .login-link {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.75rem;
          color: #4b5563;
        }
        
        .login-link a {
          color: #0c4a6e; /* text-sky-600 equivalent */
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}