'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { FaGoogle } from 'react-icons/fa6';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { validateEmailWithDomain } from '@/lib/emailValidation';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const router = useRouter();

  // New state for password validation
  const [showValidation, setShowValidation] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    specialChar: false,
    noIdentical: false,
    typeCount: false,
  });

  // Function to validate the password and update state
  const validatePassword = (pwd) => {
    const validations = {
      length: pwd.length >= 12,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      specialChar: /[!@#$%^&*]/.test(pwd),
      noIdentical: !/(.)\1{2,}/.test(pwd),
    };

    const typeCount = [
      validations.lowercase,
      validations.uppercase,
      validations.number,
      validations.specialChar,
    ].filter(Boolean).length >= 3;

    const allValid = validations.length && validations.noIdentical && typeCount;

    setPasswordValidation({ ...validations, typeCount });
    return allValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedMiddleName = middleName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedContactNumber = contactNumber.trim();

    // Empty field check
    if (!trimmedFirstName || !trimmedLastName || !birthdate || !trimmedContactNumber || !trimmedEmail || !password || !confirm) {
      setError("All required fields except middle name must be filled.");
      return;
    }

    // Contact number validation (11 digits)
    if (trimmedContactNumber.length !== 11 || !/^\d+$/.test(trimmedContactNumber)) {
      setError("Contact number must be exactly 11 digits.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Password validation using the new logic
    if (!validatePassword(password)) {
      setError("Please meet all password requirements.");
      setShowValidation(true);
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
        body: JSON.stringify({
          firstName: trimmedFirstName,
          middleName: trimmedMiddleName || null,
          lastName: trimmedLastName,
          birthdate,
          contactNumber: trimmedContactNumber,
          email: trimmedEmail,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowOtpForm(true);
        setError('');
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong.');
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/guest/dashboard');
      } else {
        setError(data.error || 'OTP verification failed.');
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
          <h2 className="title">{showOtpForm ? 'Verify OTP' : 'Sign Up'}</h2>

          {!showOtpForm ? (
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
                    const isValidFormat = emailRegex.test(e.target.value);
                    const domainValidation = validateEmailWithDomain(e.target.value);
                    setIsValidEmail(isValidFormat && domainValidation.isValid);
                  }}
                  required
                />
                {!isValidEmail && (
                  <span className="error-text">
                    Please enter a valid email address.
                  </span>
                )}
              </div>

              {/* First Name */}
              <div className="input-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setError(''); }}
                  required
                />
              </div>

              {/* Middle Name (Optional) */}
              <div className="input-group">
                <label htmlFor="middleName">Middle Name <span style={{ fontWeight: 'normal', fontStyle: 'italic', color: '#6b7280' }}>(Optional)</span></label>
                <input
                  type="text"
                  id="middleName"
                  value={middleName}
                  onChange={(e) => { setMiddleName(e.target.value); setError(''); }}
                  placeholder="Optional"
                />
              </div>

              {/* Last Name */}
              <div className="input-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setError(''); }}
                  required
                />
              </div>

              {/* Birthdate */}
              <div className="input-group">
                <label htmlFor="birthdate">Birthdate</label>
                <input
                  type="date"
                  id="birthdate"
                  value={birthdate}
                  onChange={(e) => { setBirthdate(e.target.value); setError(''); }}
                  required
                  max={new Date().toISOString().split("T")[0]} // prevent future dates
                />
              </div>

              {/* Contact Number */}
              <div className="input-group">
                <label htmlFor="contactNumber">Contact Number</label>
                <input
                  type="tel"
                  id="contactNumber"
                  value={contactNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d{0,11}$/.test(val)) {
                      setContactNumber(val);
                      setError('');
                    }
                  }}
                  maxLength={11}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                      validatePassword(e.target.value);
                    }}
                    onFocus={() => setShowValidation(true)}
                    onBlur={() => {
                      if (validatePassword(password)) {
                        setShowValidation(false);
                      }
                    }}
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
                {/* Password validation checklist */}
                {(showValidation || password.length > 0) && (
                  <div className="validation-checklist">
                    <p>Password must meet the following criteria:</p>
                    <ul>
                      <li className={passwordValidation.length ? 'valid' : 'invalid'}>
                        {passwordValidation.length ? <Check size={14} /> : <X size={14} />}
                        <span>At least 12 characters</span>
                      </li>
                      <li className={passwordValidation.typeCount ? 'valid' : 'invalid'}>
                        {passwordValidation.typeCount ? <Check size={14} /> : <X size={14} />}
                        <span>At least 3 of the following types:</span>
                        <ul>
                          <li className={passwordValidation.lowercase ? 'valid' : 'invalid'}>
                            {passwordValidation.lowercase ? <Check size={14} /> : <X size={14} />}
                            <span>Lower case letters (a-z)</span>
                          </li>
                          <li className={passwordValidation.uppercase ? 'valid' : 'invalid'}>
                            {passwordValidation.uppercase ? <Check size={14} /> : <X size={14} />}
                            <span>Upper case letters (A-Z)</span>
                          </li>
                          <li className={passwordValidation.number ? 'valid' : 'invalid'}>
                            {passwordValidation.number ? <Check size={14} /> : <X size={14} />}
                            <span>Numbers (0-9)</span>
                          </li>
                          <li className={passwordValidation.specialChar ? 'valid' : 'invalid'}>
                            {passwordValidation.specialChar ? <Check size={14} /> : <X size={14} />}
                            <span>Special characters (!@#$%^&*)</span>
                          </li>
                        </ul>
                      </li>
                      <li className={passwordValidation.noIdentical ? 'valid' : 'invalid'}>
                        {passwordValidation.noIdentical ? <Check size={14} /> : <X size={14} />}
                        <span>No more than 2 identical characters in a row</span>
                      </li>
                    </ul>
                  </div>
                )}
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
          ) : (
            <div className="otp-form">
              <p>Please enter the OTP sent to your email.</p>
              <div className="input-group">
                <label htmlFor="otp">OTP</label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value); setError(''); }}
                  required
                  maxLength={6}
                />
              </div>
              <button
                type="button"
                onClick={verifyOtp}
                className="signup-button"
              >
                Verify OTP
              </button>
            </div>
          )}

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
          max-width: 1200px; /* Increased for more fields */
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
        
        .password-field {r
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

        /* NEW STYLES FOR PASSWORD VALIDATION */
        .validation-checklist {
          margin-top: 0.5rem;
          padding: 0.75rem;
          border-radius: 0.25rem;
          background-color: #f1f5f9; /* gray-100 */
          font-size: 0.75rem;
        }
        .validation-checklist p {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
        }
        .validation-checklist ul {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }
        .validation-checklist li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .validation-checklist li ul {
          margin-left: 1.5rem;
          margin-top: 0.25rem;
        }
        .validation-checklist .valid {
          color: #16a34a; /* green-600 */
        }
        .validation-checklist .invalid {
          color: #ef4444; /* red-500 */
        }
      `}</style>
    </div>
  );
}