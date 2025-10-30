'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa6';
import { Calendar, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAccountLinking } from '@/hooks/useAccountLinking';
import {
  useAccountLinkingModal,
  AccountDetectionModal,
  AccountLinkingOTPModal,
  DataSelectionModal,
  AccountLinkingSuccessModal
} from '@/components/CustomModals';
import TermsModal from '@/components/TermsModal';

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
  const [rulesTarget, setRulesTarget] = useState('password'); // 'password' | 'confirm'
  const [countdown, setCountdown] = useState(0);
  // Birthdate error state (renamed to avoid any TDZ/name-collision issues)
  const [birthdateErrorMsg, setBirthdateErrorMsg] = useState('');
  // Terms and Agreement modal state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Birthdate validation function
  const validateBirthdate = (birthdate) => {
    if (!birthdate) return true;
    const today = new Date();
    const birthDate = new Date(birthdate);
    const maxBirthDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    if (birthDate < maxBirthDate) {
      setBirthdateErrorMsg('Maximum age is 100 years.');
      return false;
    }
    setBirthdateErrorMsg('');
    return true;
  };

    // Allowed email domains
    const allowedDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
      'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com', 'aol.com'
    ];

    function isAllowedEmail(email) {
      const match = email.match(/^.+@(.+)$/);
      if (!match) return false;
      const domain = match[1].toLowerCase();
      return allowedDomains.includes(domain);
    }

  // Account linking hooks
  const [linkingModal, setLinkingModal] = useAccountLinkingModal();
  const {
    loading: linkingLoading,
    error: linkingError,
    setError: setLinkingError,
    checkAccountLinking,
    verifyLinkingOTP,
    resendLinkingOTP,
    completeLinking,
    handleGoogleSignInWithLinking
  } = useAccountLinking();

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

  // Helper: evaluate password strength as percentage and level
  const getPasswordStrength = (password) => {
    const total = passwordRules.length;
    if (!password) return { count: 0, percent: 0, level: 'red' };
    const count = passwordRules.reduce((acc, r) => acc + (r.test(password) ? 1 : 0), 0);
    const percent = Math.round((count / total) * 100);
    let level = 'red';
    if (percent === 100) level = 'green';
    else if (percent >= 50) level = 'yellow'; // 50–99% is acceptable (yellow)
    return { count, percent, level };
  };

  // Valid Philippine mobile prefixes (Globe, Smart, Sun, DITO, etc.)
  const validPhPrefixes = [
    '0813', '0817', '0905', '0906', '0915', '0916', '0917', '0926', '0927', '0935', '0936', '0937', '0945', '0953', '0954', '0955', '0956', '0963', '0964', '0965', '0966', '0967', '0975', '0976', '0977', '0978', '0979', '0981', '0989', '0992', '0993', '0994', '0995', '0996', '0997', // Globe
    '0813', '0900', '0907', '0908', '0909', '0910', '0911', '0912', '0913', '0914', '0918', '0919', '0920', '0921', '0928', '0929', '0930', '0938', '0939', '0940', '0946', '0947', '0948', '0949', '0950', '0951', '0961', '0970', '0971', '0980', '0981', '0982', '0983', '0984', '0985', '0989', '0998', '0999', // Smart/TNT
    '0922', '0923', '0924', '0925', '0931', '0932', '0933', '0934', '0940', '0941', '0942', '0943', '0944', '0973', '0974', // Sun
    '0895', '0896', '0897', '0898', '0991' // DITO
  ];

  // Real-time validation helper
  const validateFormInRealTime = (updatedForm) => {
    // Check terms acceptance
    if (!termsAccepted) {
      return; // Don't validate until terms are ready to check
    }

    // Email validation
    if (updatedForm.email && !isAllowedEmail(updatedForm.email)) {
      return; // Keep error if email still invalid
    }

    // Phone validation
    if (updatedForm.contact) {
      if (updatedForm.contact.length === 10 && updatedForm.contact.startsWith('9')) {
        const prefix = '0' + updatedForm.contact.substring(0, 3);
        const hasRepeats = /^(.)\1{9}$/.test(updatedForm.contact);
        const isSeq = (num) => {
          const digits = num.split('').map(Number);
          let asc = true, desc = true;
          for (let i = 1; i < digits.length; i++) {
            if (digits[i] !== digits[i-1] + 1) asc = false;
            if (digits[i] !== digits[i-1] - 1) desc = false;
          }
          return asc || desc;
        };
        
        if (validPhPrefixes.includes(prefix) && !hasRepeats && !isSeq(updatedForm.contact)) {
          // Phone is now valid, check if we should clear error
          if (error && (error.includes('mobile number') || error.includes('contact'))) {
            setError('');
          }
        }
      }
    }

    // Password strength validation
    if (updatedForm.password) {
      const strength = getPasswordStrength(updatedForm.password);
      if (strength.percent >= 50) {
        // Password is now acceptable
        if (error && error.includes('Password is too weak')) {
          setError('');
        }
      }
    }

    // Password match validation
    if (updatedForm.password && updatedForm.confirm) {
      if (updatedForm.password === updatedForm.confirm) {
        if (error && error.includes('Passwords do not match')) {
          setError('');
        }
      }
    }

    // Birthdate validation
    if (updatedForm.birthdate) {
      const birthDate = new Date(updatedForm.birthdate);
      const today = new Date();
      const minBirthDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
      const maxBirthDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
      
      if (birthDate <= minBirthDate && birthDate >= maxBirthDate) {
        if (error && (error.includes('age') || error.includes('birthdate'))) {
          setError('');
        }
      }
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'contact') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      const updatedForm = { ...form, contact: cleaned };
      setForm(updatedForm);
      validateFormInRealTime(updatedForm);
      return;
    }
      if (name === 'birthdate') {
        // Validate age
        const birthDate = new Date(value);
        const today = new Date();
        const minBirthDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
        const maxBirthDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        if (birthDate > minBirthDate) {
          setBirthdateErrorMsg('You must be at least 16 years old to register.');
        } else if (birthDate < maxBirthDate) {
          setBirthdateErrorMsg('Maximum age is 100 years.');
        } else {
          setBirthdateErrorMsg('');
        }
      }
    const updatedForm = { ...form, [name]: value };
    setForm(updatedForm);
    validateFormInRealTime(updatedForm);
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
          // Check if terms are accepted first
          if (!termsAccepted) {
            setIsLoading(false);
            setShowTermsModal(true);
            throw new Error('Please accept the Terms and Agreement to continue');
          }
          
          // Email domain validation
          if (!isAllowedEmail(form.email)) {
            throw new Error('Only common email domains are allowed: gmail, yahoo, outlook, hotmail, icloud, protonmail, zoho, mail.com, aol');
          }
        
        // Validate Philippine mobile number
        if (!form.contact || form.contact.length !== 10) {
          throw new Error('Please enter a valid 10-digit mobile number');
        }
        if (!form.contact.startsWith('9')) {
          throw new Error('Mobile number must start with 9');
        }
        
        // Check if number is valid Philippine prefix
        const prefix = '0' + form.contact.substring(0, 3); // Convert 9XX to 09XX
        if (!validPhPrefixes.includes(prefix)) {
          throw new Error('Invalid Philippine mobile number. Please enter a valid Globe, Smart, Sun, or DITO number');
        }
        
        // Reject numbers with all same digits (e.g., 9999999999)
        if (/^(.)\1{9}$/.test(form.contact)) {
          throw new Error('Please enter a valid mobile number (all same digits are not allowed)');
        }
        
        // Reject sequential patterns (e.g., 9123456789, 9876543210)
        const isSequential = (num) => {
          const digits = num.split('').map(Number);
          let ascending = true;
          let descending = true;
          for (let i = 1; i < digits.length; i++) {
            if (digits[i] !== digits[i-1] + 1) ascending = false;
            if (digits[i] !== digits[i-1] - 1) descending = false;
          }
          return ascending || descending;
        };
        if (isSequential(form.contact)) {
          throw new Error('Please enter a valid mobile number (sequential patterns are not allowed)');
        }
        
        // Password strength validation (allow Yellow or Green)
        const strength = getPasswordStrength(form.password);
        if (strength.percent < 50) {
          throw new Error('Password is too weak. Please meet at least 50% of the requirements.');
        }
        if (form.password !== form.confirm) {
          throw new Error('Passwords do not match');
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

  // Google sign-up handler with account linking
  const handleGoogleSignUp = async () => {
    try {
      const result = await handleGoogleSignInWithLinking('/guest/dashboard');
      
      if (result.requiresLinking) {
        // Show account linking modal
        setLinkingModal({
          show: true,
          type: 'detect',
          email: result.email,
          googleData: result.googleData
        });
      }
    } catch (error) {
      setError(error.message);
    }
  };

  // Account linking handlers
  const handleProceedLinking = async () => {
    try {
      const result = await checkAccountLinking(linkingModal.email, linkingModal.googleData);
      setLinkingModal({
        show: true,
        type: 'otp',
        email: linkingModal.email,
        existingUser: result.existingUser,
        googleData: linkingModal.googleData,
        otpSent: true
      });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCancelLinking = () => {
    setLinkingModal({ show: false });
    setLinkingError('');
  };

  const handleVerifyOTP = async (otp) => {
    try {
      const result = await verifyLinkingOTP(linkingModal.email, otp);
      
      setLinkingModal({
        show: true,
        type: 'dataSelection',
        email: linkingModal.email,
        existingUser: result.existingUser,
        googleData: result.googleData
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleResendLinkingOTP = async () => {
    try {
      await resendLinkingOTP(linkingModal.email);
      setLinkingError('');
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleCompleteDataSelection = async (selectedData) => {
    try {
      await completeLinking(
        linkingModal.email,
        selectedData,
        linkingModal.existingUser,
        linkingModal.googleData
      );
      
      setLinkingModal({
        show: true,
        type: 'success',
        email: linkingModal.email
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleFinalSignIn = async (method) => {
    setLinkingModal({ show: false });
    
    if (method === 'google') {
      await signIn('google', {
        callbackUrl: '/guest/dashboard',
      });
    } else {
      // Redirect to login form for password authentication
      router.push('/login');
    }
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 16);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <>
        <div className="auth-page">
        {/* Background */}
        <div className="bg-gradient"></div>
        
        {/* Floating Background Shapes */}
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
        
        {/* Main Content */}
        <div className="auth-container">
          <div className="auth-card">
            {/* Logo Section */}
            <div className="logo-section">
              <Image
                src="/images/logo.png"
                alt="Charkool Resort"
                width={180}
                height={180}
                className="logo-image"
                priority
              />
              <h1 className="auth-title">Sign Up</h1>
              <p className="auth-subtitle">Create your account</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {/* Personal Details Section */}
              <div className="form-section">
                <h3 className="section-title">Personal Details</h3>
                <div className="field-group">
                  <label className="field-label">First Name *</label>
                  <div className="field-wrapper">
                    <input 
                      className="field-input" 
                      name="firstName" 
                      placeholder="Enter first name" 
                      value={form.firstName} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Middle Name</label>
                  <div className="field-wrapper">
                    <input 
                      className="field-input" 
                      name="middleName" 
                      placeholder="Optional" 
                      value={form.middleName} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Last Name *</label>
                  <div className="field-wrapper">
                    <input 
                      className="field-input" 
                      name="lastName" 
                      placeholder="Enter last name" 
                      value={form.lastName} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Contact Details Section */}
              <div className="form-section">
                <h3 className="section-title">Contact Details</h3>
                <div className="field-group">
                  <label className="field-label">Birthday *</label>
                  <div className="field-wrapper">
                    <Calendar className="field-icon" size={16} />
                    <input
                      className="field-input"
                      type="date"
                      id="birthdate"
                      name="birthdate"
                      value={form.birthdate}
                      onChange={handleChange}
                      required
                        max={maxDateStr}
                        min={(() => {
                          const today = new Date();
                          const maxBirthDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
                          return maxBirthDate.toISOString().split('T')[0];
                        })()}
                    />
                      {birthdateErrorMsg && <span style={{color:'red',fontSize:'0.9rem'}}>{birthdateErrorMsg}</span>}
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label">Phone Number *</label>
                  <div className="phone-number-wrapper">
                    <span className="country-prefix">+63</span>
                    <div className="field-wrapper">
                      <input
                        className="field-input"
                        name="contact"
                        placeholder="9XXXXXXXXX"
                        value={form.contact}
                        onChange={handleChange}
                        pattern="[9][0-9]{9}"
                        required
                      />
                    </div>
                  </div>
                  <p className="field-hint">⚠️ Please enter your real mobile number. Only valid Philippine numbers (Globe, Smart, Sun, DITO) are accepted.</p>
                </div>
                <div className="field-group">
                  <label className="field-label">Email Address *</label>
                  <div className="field-wrapper">
                    <input 
                      className="field-input" 
                      name="email" 
                      type="email" 
                      placeholder="Enter email address" 
                      value={form.email} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="form-section">
                <h3 className="section-title">Security</h3>
                <div className="field-group">
                  <label className="field-label">Password *</label>
                  <div className="field-wrapper">
                    <input
                      className="field-input"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter password"
                      value={form.password}
                      onChange={handleChange}
                      onFocus={() => { setShowRules(true); setRulesTarget('password'); }}
                      onBlur={() => setShowRules(false)}
                      required
                    />
                    <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Password Strength Indicator */}
                  {form.password && (() => {
                    const s = getPasswordStrength(form.password);
                    const label = s.level === 'green' ? 'Strong' : s.level === 'yellow' ? 'Okay' : 'Weak';
                    return (
                      <div className="strength-meter" aria-live="polite">
                        <div className="strength-bar-bg">
                          <div className={`strength-bar ${s.level}`} style={{ width: `${s.percent}%` }} />
                        </div>
                        <span className={`strength-label ${s.level}`}>{label} ({s.percent}%)</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="field-group">
                  <label className="field-label">Confirm Password *</label>
                  <div className="field-wrapper">
                    <input
                      className="field-input"
                      type={showConfirm ? 'text' : 'password'}
                      name="confirm"
                      placeholder="Confirm password"
                      value={form.confirm}
                      onChange={handleChange}
                      onFocus={() => { setShowRules(true); setRulesTarget('confirm'); }}
                      onBlur={() => setShowRules(false)}
                      required
                    />
                    {/* Success indicator when passwords match */}
                    {form.password && form.confirm && form.password === form.confirm && (
                      <span className="success-indicator" aria-label="Passwords match">
                        <CheckCircle size={18} />
                      </span>
                    )}
                    <button type="button" className="toggle-btn" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                {showRules && (
                  <div className="password-rules">
                    {passwordRules.map((rule, idx) => {
                      const value = rulesTarget === 'confirm' ? form.confirm : form.password;
                      const ok = rule.test(value);
                      return (
                        <div key={idx} className={`rule ${ok ? 'valid' : 'invalid'}`}>
                          <span className="rule-icon">{ok ? '✓' : '×'}</span>
                          <span className="rule-text">{rule.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* OTP Section */}
              {showOTPInput && (
                <div className="form-section">
                  <h3 className="section-title">Verification</h3>
                  <div className="field-group">
                    <label className="field-label">Verification Code *</label>
                    <div className="field-wrapper">
                      <input
                        className="field-input otp-input"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                      />
                    </div>
                    <p className="otp-hint">Check your email for the verification code</p>
                    {countdown > 0 ? (
                      <p className="otp-countdown">Resend available in {countdown}s</p>
                    ) : (
                      <div className="otp-actions">
                        <p className="otp-retry">Didn't receive the code?</p>
                        <button type="button" className="resend-btn" onClick={handleResendOTP}>
                          Resend OTP
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && <div className="error-message">{error}</div>}

              {/* Terms and Agreement Checkbox */}
              {!showOTPInput && (
                <div className="terms-container">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="terms-checkbox"
                  />
                  <label htmlFor="termsCheckbox" className="terms-label">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="terms-link"
                    >
                      Terms and Agreement
                    </button>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : (showOTPInput ? 'Verify Account' : 'Sign Up')}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <span>or</span>
            </div>

            {/* Google Sign Up */}
            <button 
              className="google-btn" 
              type="button"
              onClick={handleGoogleSignUp}
            >
              <FaGoogle size={18} /> 
              Sign up with Google
            </button>

            {/* Login Link */}
            <div className="auth-footer">
              <p>Already have an account? <Link href="/login" className="auth-link">Sign In</Link></p>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="divider"></div>
        <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
      </footer>



      <style jsx>{`
        /* Modern Authentication Page Layout */
        .auth-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, 
            #f8fafc 0%, 
            #f1f5f9 20%,
            #e2e8f0 40%,
            #cbd5e1 60%,
            #94a3b8 80%,
            #64748b 100%
          );
          padding-top: 80px;
        }

        .bg-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            #ffffff 0%, 
            #f0f9ff 15%,
            #e0f2fe 30%,
            #bae6fd 50%,
            #7dd3fc 70%,
            #38bdf8 85%,
            #0ea5e9 100%);
          opacity: 0.6;
          animation: gradientShift 20s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { opacity: 0.6; }
          25% { opacity: 0.4; }
          50% { opacity: 0.7; }
          75% { opacity: 0.5; }
        }

        /* Floating Background Shapes */
        .floating-shapes {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, 
            rgba(59, 130, 246, 0.1), 
            rgba(147, 197, 253, 0.15),
            rgba(219, 234, 254, 0.1)
          );
          filter: blur(1px);
          animation: float 15s ease-in-out infinite;
        }

        .shape-1 {
          width: 200px;
          height: 200px;
          top: 10%;
          left: 85%;
          animation-delay: 0s;
          background: linear-gradient(135deg, 
            rgba(59, 130, 246, 0.08), 
            rgba(147, 197, 253, 0.12)
          );
        }

        .shape-2 {
          width: 150px;
          height: 150px;
          top: 60%;
          left: 90%;
          animation-delay: -5s;
          background: linear-gradient(135deg, 
            rgba(37, 99, 235, 0.06), 
            rgba(96, 165, 250, 0.1)
          );
        }

        .shape-3 {
          width: 100px;
          height: 100px;
          top: 20%;
          left: -5%;
          animation-delay: -10s;
          background: linear-gradient(135deg, 
            rgba(59, 130, 246, 0.1), 
            rgba(147, 197, 253, 0.15)
          );
        }

        .shape-4 {
          width: 120px;
          height: 120px;
          top: 75%;
          left: -3%;
          animation-delay: -7s;
          background: linear-gradient(135deg, 
            rgba(37, 99, 235, 0.08), 
            rgba(96, 165, 250, 0.12)
          );
        }

        .shape-5 {
          width: 80px;
          height: 80px;
          top: 45%;
          left: 88%;
          animation-delay: -12s;
          background: linear-gradient(135deg, 
            rgba(59, 130, 246, 0.12), 
            rgba(147, 197, 253, 0.08)
          );
        }

        @keyframes float {
          0%, 100% { 
            transform: translateY(0) translateX(0) rotate(0deg);
          }
          25% { 
            transform: translateY(-20px) translateX(10px) rotate(90deg);
          }
          50% { 
            transform: translateY(-10px) translateX(-15px) rotate(180deg);
          }
          75% { 
            transform: translateY(-25px) translateX(5px) rotate(270deg);
          }
        }



        .auth-container {
          position: relative;
          z-index: 20;
          min-height: calc(100vh - 160px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 1rem;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 10px 25px -5px rgba(59, 130, 246, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: cardEntrance 0.8s ease-out;
          position: relative;
          overflow: hidden;
        }

        .auth-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
        }

        @keyframes cardEntrance {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .logo-section {
          text-align: center;
          margin-bottom: 1rem;
          position: relative;
        }

        .logo-image {
          border-radius: 12px;
          margin-bottom: 0.5rem;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          animation: logoFloat 6s ease-in-out infinite;
          /* responsive: never smaller than 80px, scale with viewport, max 180px */
          width: clamp(80px, 18vw, 180px);
          height: auto;
          object-fit: contain;
        }

        .logo-image:hover {
          transform: scale(1.05) rotate(2deg);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .auth-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: #1e293b;
          letter-spacing: -0.025em;
          line-height: 1.1;
        }

        @keyframes titleGlow {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.1); }
        }

        .auth-subtitle {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 400;
          line-height: 1.4;
          margin: 0 auto 0.5rem auto;
          max-width: 400px;
        }

        /* Form Sections */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          position: relative;
        }

        .section-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0;
          padding-bottom: 0.4rem;
          position: relative;
          letter-spacing: -0.005em;
          border-bottom: 1px solid #e5e7eb;
        }

        @keyframes underlineGlow {
          0% { width: 40px; opacity: 0.8; }
          100% { width: 60px; opacity: 1; }
        }



        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          letter-spacing: 0.01em;
          margin-bottom: 0;
          position: relative;
          transition: color 0.3s ease;
        }

        .field-hint {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 0.4rem;
          margin-bottom: 0;
          line-height: 1.4;
          display: flex;
          align-items: flex-start;
          gap: 0.25rem;
        }

        .field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          transition: all 0.2s ease;
          height: 44px;
          overflow: hidden;
        }

        .field-wrapper:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          background: #ffffff;
        }

        .field-wrapper:hover {
          border-color: #9ca3af;
        }

        .field-icon {
          padding: 0.75rem 1.0rem; /* match login spacing */
          color: #9ca3af;
          flex-shrink: 0;
          transition: color 0.2s ease;
          border-right: 1px solid #e5e7eb;
          background: #f9fafb;
          margin-right: 0; /* spacing handled by input padding */
        }

        .field-wrapper:focus-within .field-icon {
          color: #2563eb;
        }

        .field-input {
          flex: 1;
          padding: 0.6rem 0.6rem 0.6rem 0.95rem; /* add left padding so text clears icon */
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.9rem;
          color: #1e293b;
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        .field-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        /* Phone Number Field */
        /* make the prefix and input look like a single control */
        .phone-number-wrapper {
          display: flex;
          align-items: center;
          gap: 0; /* ensure they touch */
          width: 100%;
          height: 44px; /* fixed control height for visual consistency */
          border: 1px solid #d1d5db; /* unified border around both elements */
          border-radius: 8px;
          overflow: hidden; /* keep the two pieces clipped to the rounded corners */
          background: #ffffff;
        }

        /* prefix: left piece */
        .country-prefix {
          font-size: 0.9rem;
          font-weight: 600;
          color: #475569;
          padding: 0 0.5rem; /* reduce horizontal padding */
          background: #f8fafc; /* subtle contrast */
          flex: 0 0 48px; /* narrower fixed width */
          min-width: 48px;
          text-align: center;
          height: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(226,232,240,0.9); /* slight divider */
        }

        /* right piece becomes the input area; remove inner border and let wrapper handle it */
        .phone-number-wrapper .field-wrapper {
          flex: 1 1 auto;
          min-width: 0; /* prevent overflow */
          border: none; /* remove the original border so the wrapper border shows */
          height: 100%;
          background: transparent;
          display: flex;
          align-items: center;
        }

        /* input itself should fill the right area and match vertical padding */
        .phone-number-wrapper .field-wrapper .field-input {
          width: 100%;
          height: 100%;
          padding: 0 0.75rem; /* left/right padding inside input */
          box-sizing: border-box;
          border: none;
          background: transparent;
          font-size: 0.9rem;
        }

        .toggle-btn {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.25rem;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-btn:hover {
          color: #f59e0b;
        }

        /* Password strength meter */
        .strength-meter {
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .strength-bar-bg {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
        }
        .strength-bar {
          height: 100%;
          transition: width 0.25s ease;
        }
        .strength-bar.red { background: #ef4444; }
        .strength-bar.yellow { background: #f59e0b; }
        .strength-bar.green { background: #10b981; }
        .strength-label {
          font-size: 0.8rem;
          font-weight: 600;
        }
        .strength-label.red { color: #b91c1c; }
        .strength-label.yellow { color: #b45309; }
        .strength-label.green { color: #065f46; }

        /* Success indicator for matching passwords */
        .success-indicator {
          position: absolute;
          right: 42px; /* sit before the eye toggle */
          color: #10b981; /* emerald-500 */
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* Password Rules */
        .password-rules {
          margin-top: 0.75rem;
          padding: 1rem;
          background: rgba(248, 250, 252, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 12px;
          border: 1px solid rgba(226, 232, 240, 0.6);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          animation: rulesSlideIn 0.3s ease-out;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.4rem;
        }

        @keyframes rulesSlideIn {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .rule {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .rule-icon {
          font-weight: 700;
          font-size: 0.75rem;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .rule.valid .rule-icon {
          color: #ffffff;
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
          transform: scale(1.1);
        }

        .rule.invalid .rule-icon {
          color: #ffffff;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        .rule.valid .rule-text {
          color: #065f46;
          text-decoration: line-through;
          opacity: 0.8;
        }

        .rule.invalid .rule-text {
          color: #374151;
        }

        /* OTP Input */
        .otp-input {
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.75rem;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1));
          border: 2px solid rgba(245, 158, 11, 0.3);
        }

        .otp-input:focus {
          border-color: #f59e0b;
          box-shadow: 
            0 0 0 4px rgba(245, 158, 11, 0.15),
            0 8px 32px rgba(245, 158, 11, 0.2);
        }

        .otp-hint, .otp-countdown, .otp-retry {
          font-size: 0.9rem;
          color: #64748b;
          margin-top: 0.75rem;
          font-weight: 500;
        }

        .otp-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .resend-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          color: white;
          font-weight: 600;
          cursor: pointer;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
        }

        .resend-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }

        /* Buttons */
        .primary-btn {
          width: 100%;
          padding: 0.875rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .primary-btn:hover {
          background: #1d4ed8;
        }

        .primary-btn:active {
          background: #1e40af;
        }

        .primary-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .divider {
          position: relative;
          text-align: center;
          margin: 0.75rem 0;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.4), transparent);
          z-index: 1;
        }

        .divider span {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          padding: 0 1.5rem;
          position: relative;
          z-index: 2;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .google-btn {
          width: 100%;
          padding: 0.875rem;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          color: #374151;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          height: 46px;
        }

        .google-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .auth-footer {
          text-align: center;
          margin-top: 0.75rem;
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }

        .auth-link {
          color: #f59e0b;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.3s ease;
          position: relative;
        }

        .auth-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #f59e0b, #d97706);
          transition: width 0.3s ease;
        }

        .auth-link:hover::after {
          width: 100%;
        }

        .auth-link:hover {
          color: #d97706;
        }

        .error-message {
          padding: 1rem 1.25rem;
          background: rgba(254, 242, 242, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(254, 202, 202, 0.8);
          border-radius: 12px;
          color: #dc2626;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
          margin-top: 1rem;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.1);
          animation: errorShake 0.5s ease-in-out;
        }

        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        /* Terms and Agreement Checkbox Styles */
        .terms-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(254, 243, 199, 0.3);
          border: 1px solid rgba(252, 211, 77, 0.4);
          border-radius: 12px;
        }

        .terms-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          flex-shrink: 0;
          accent-color: #FEBE52;
        }

        .terms-label {
          color: #374151;
          font-size: 0.9rem;
          cursor: pointer;
          margin: 0;
          user-select: none;
        }

        .terms-link {
          background: none;
          border: none;
          color: #FEBE52;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: 0.9rem;
        }

        .terms-link:hover {
          color: #F0790C;
        }

        /* Footer Styles */
        .footer {
          background: rgba(232, 207, 163, 0.9);
          text-align: center;
          padding: 1.5rem 0;
          color: rgba(18, 50, 56, 0.85);
          font-size: 0.9rem;
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(211, 184, 133, 0.3);
        }

        .footer .divider {
          width: 80%;
          height: 1px;
          background-color: #d3b885;
          margin: 0 auto 1rem auto;
        }

        .footer p {
          margin: 0;
          font-weight: 500;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .auth-card {
            max-width: 580px;
            padding: 3rem 2.5rem;
          }
        }

        @media (max-width: 768px) {
          .auth-container {
            padding: 1rem;
          }
          
          .auth-card {
            margin: 0;
            padding: 2.5rem 2rem;
            border-radius: 24px;
          }
          
          .auth-title {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }
          
          .auth-subtitle {
            font-size: 1rem;
          }
          

          
          .phone-number-wrapper {
            gap: 0; /* attached */
            width: 100%;
            height: 44px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            overflow: hidden;
            background: #ffffff;
          }

          .phone-number-wrapper .field-wrapper {
            flex: 1 1 auto;
            min-width: 0;
            border: none;
            height: 100%;
            display: flex;
            align-items: center;
          }

          .country-prefix {
            min-width: 48px;
            flex: 0 0 48px;
            height: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid rgba(226,232,240,0.9);
          }
          
          .shape-1 { width: 180px; height: 180px; }
          .shape-2 { width: 140px; height: 140px; }
          .shape-3 { width: 100px; height: 100px; }
          .shape-4 { width: 120px; height: 120px; }
          
          .section-title {
            font-size: 1.125rem;
          }
          
          .form-section {
            gap: 1.25rem;
          }
        }

        @media (max-width: 640px) {
          .auth-container {
            padding: 0.5rem;
          }
          
          .auth-card {
            padding: 2rem 1.5rem;
            border-radius: 20px;
          }
          
          /* logo scales via clamp(), no fixed size needed here */
          
          .auth-title {
            font-size: 1.75rem;
          }
          
          .auth-subtitle {
            font-size: 0.95rem;
          }
          
          .field-wrapper {
            height: 52px;
          }
          
          .field-input {
            font-size: 0.95rem;
          }
          
          .primary-btn {
            height: 56px;
            font-size: 1rem;
            padding: 1rem;
          }
          
          .google-btn {
            height: 52px;
            font-size: 0.95rem;
          }
          
          .shape-1 { width: 150px; height: 150px; }
          .shape-2 { width: 120px; height: 120px; }
          .shape-3 { width: 80px; height: 80px; }
          .shape-4 { width: 100px; height: 100px; }
        }

        @media (max-width: 480px) {
          .auth-container {
            padding: 0.25rem;
            min-height: calc(100vh - 60px);
          }
          
          .auth-card {
            padding: 1.5rem 1.25rem;
            border-radius: 16px;
            margin: 0.25rem;
          }
          
          .logo-section {
            margin-bottom: 2rem;
          }
          
          /* logo scales via clamp(), no fixed size needed here */
          
          .auth-title {
            font-size: 1.5rem;
            line-height: 1.3;
          }
          
          .auth-subtitle {
            font-size: 0.9rem;
          }
          
          .auth-form {
            gap: 1.5rem;
          }
          
          .form-section {
            gap: 1rem;
          }
          
          .section-title {
            font-size: 1rem;
            margin-bottom: 0.75rem;
          }
          
          .field-wrapper {
            height: 48px;
          }
          
          .field-icon {
            padding: 0 1rem;
          }
          
          .field-input {
            font-size: 0.9rem;
          }
          
          .field-label {
            font-size: 0.85rem;
            margin-bottom: 0.4rem;
          }
          
          .primary-btn {
            height: 52px;
            font-size: 0.95rem;
            margin-top: 1.5rem;
          }
          
          .google-btn {
            height: 48px;
            font-size: 0.9rem;
          }
          
          .password-rules {
            padding: 1rem;
          }
          
          .rule {
            font-size: 0.85rem;
            padding: 0.4rem 0;
          }
          
          .otp-input {
            font-size: 1.25rem;
            letter-spacing: 0.5rem;
          }
          
          .floating-shapes {
            opacity: 0.5;
          }
          
          .shape-1 { width: 120px; height: 120px; }
          .shape-2 { width: 100px; height: 100px; }
          .shape-3 { width: 60px; height: 60px; }
          .shape-4 { width: 80px; height: 80px; }
        }

        @media (max-width: 360px) {
          .auth-card {
            padding: 1.25rem 1rem;
          }
          
          .auth-title {
            font-size: 1.375rem;
          }
          
          .field-wrapper {
            height: 44px;
          }
          
          .primary-btn {
            height: 48px;
          }
          
          .google-btn {
            height: 44px;
          }
          
          .otp-input {
            font-size: 1.125rem;
            letter-spacing: 0.4rem;
          }
        }
        
        .auth-subtitle {
          font-size: 1.2rem;
          font-weight: 500;
          line-height: 1.5;
          text-shadow: 0 1px 2px rgba(0,0,0,0.05);
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
          max-width: 580px;
          padding: 2.25rem;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          border: 1px solid rgba(245, 158, 11, 0.1);
        }
        .form-title {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 1.2rem;
          text-align: center;
          color: #0f172a;
          background: linear-gradient(135deg, #0f172a 0%, #374151 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .name-section {
          margin-bottom: 1rem;
        }
        .input-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.75rem;
          width: 100%;
        }
        .input-row {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          width: 100%;
        }
        .input-field {
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .field-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.3rem;
          letter-spacing: 0.025em;
        }
        .birthday-field {
          flex: 0 0 180px;
        }
        .phone-field {
          flex: 0 0 240px;
        }
        .email-field {
          margin-bottom: 1rem;
          max-width: 350px;
        }
        .password-section {
          width: 100%;
          margin-bottom: 1rem;
        }
        .password-field,
        .confirm-password-field {
          margin-bottom: 0.75rem;
          max-width: 350px;
        }
        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 0;
          align-items: center;
          width: 100%;
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          transition: all 0.2s ease;
          height: 44px;
        }
        .input-with-icon:focus-within {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
        }
        .input-icon {
          padding: 0.75rem 1.25rem;
          color: #64748b;
          pointer-events: none;
          user-select: none;
          transition: color 0.2s ease;
          flex-shrink: 0;
          border-right: 1px solid #e2e8f0;
          background: rgba(248, 250, 252, 0.8);
          margin-right: 0.5rem;
        }
        .input-with-icon:focus-within .input-icon {
          color: #f59e0b;
        }
        .signup-form input {
          width: 100%;
          height: 100%;
          padding: 0 16px 0 8px;
          border: none;
          border-radius: 0;
          font-size: 1rem;
          transition: all 0.2s ease;
          font-weight: 400;
          background: transparent;
          box-sizing: border-box;
          outline: none;
        }
        .signup-form input::placeholder {
          color: #9ca3af;
        }
        .birthdate-input::placeholder {
          font-size: 0.95rem;
          color: #9ca3af;
        }
        .password-wrapper {
          position: relative;
          width: 100%;
        }
        .password-wrapper .input-with-icon {
          padding-right: 0;
        }
        .password-wrapper .input-with-icon input {
          padding-right: 50px;
        }
        .toggle-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          transition: color 0.2s ease;
          pointer-events: auto;
          user-select: none;
        }
        .toggle-btn:hover {
          color: #f59e0b;
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
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          width: 100%;
          height: 44px;
          transition: all 0.2s ease;
        }
        .contact-wrapper:focus-within {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }
        .prefix {
          padding: 0 16px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-right: 2px solid #e5e7eb;
          color: #374151;
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
        }
        .phone-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          border: none;
        }
        .phone-input-wrapper .input-icon {
          padding: 0 12px;
          color: #64748b;
          flex-shrink: 0;
        }
        .phone-input-wrapper input {
          border: none;
          padding: 0 12px;
          font-size: 1rem;
          outline: none;
          height: 100%;
          background: transparent;
          flex: 1;
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
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.3s ease;
          font-size: 0.95rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }
        .primary-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }
        .primary-btn:hover::before {
          left: 100%;
        }
        .primary-btn:hover { 
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
        }
        .google-btn {
          margin-top: 0.75rem;
          width: 100%;
          height: 48px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-weight: 500;
          font-size: 1rem;
          color: #374151;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .google-btn:hover { 
          background: #f8fafc; 
          border-color: #d1d5db;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .login-text {
          margin-top: 0.75rem;
          text-align: center;
          font-size: 0.9rem;
          color: #374151;
        }
        .login-text a { color: #d97706; font-weight: 600; }

      `}</style>

      {/* Account Linking Modals */}
      <AccountDetectionModal
        modal={linkingModal}
        setModal={setLinkingModal}
        onProceed={handleProceedLinking}
        onCancel={handleCancelLinking}
      />
      
      <AccountLinkingOTPModal
        modal={linkingModal}
        setModal={setLinkingModal}
        onVerify={handleVerifyOTP}
        onResendOTP={handleResendLinkingOTP}
        loading={linkingLoading}
        error={linkingError}
      />
      
      <DataSelectionModal
        modal={linkingModal}
        setModal={setLinkingModal}
        onComplete={handleCompleteDataSelection}
        loading={linkingLoading}
      />
      
      <AccountLinkingSuccessModal
        modal={linkingModal}
        setModal={setLinkingModal}
        onSignIn={handleFinalSignIn}
      />

      {/* Terms and Agreement Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setTermsAccepted(true)}
      />
    </>
  );
}
