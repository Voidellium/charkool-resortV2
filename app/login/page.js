'use client';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { FaGoogle } from 'react-icons/fa6';
import { Eye, EyeOff } from 'lucide-react';
import { useAccountLinking } from '@/hooks/useAccountLinking';
import {
  useAccountLinkingModal,
  AccountDetectionModal,
  AccountLinkingOTPModal,
  DataSelectionModal,
  AccountLinkingSuccessModal
} from '@/components/CustomModals';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
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
    if (status === 'authenticated') {
      const redirectUrl = searchParams.get('redirect') || searchParams.get('callbackUrl');
      if (redirectUrl && !redirectUrl.includes('/login')) router.push(redirectUrl);
      else redirectByRole(session?.user?.role);
    }
  }, [status, session, router, searchParams]);

  useEffect(() => {
    const e = searchParams.get('error');
    const email = searchParams.get('email');
    const googleDataStr = searchParams.get('googleData');
    
    if (e === 'AccountLinking' && email && googleDataStr) {
      // Handle account linking from redirect
      try {
        const googleData = JSON.parse(decodeURIComponent(googleDataStr));
        setLinkingModal({
          show: true,
          type: 'detect',
          email: decodeURIComponent(email),
          googleData
        });
      } catch (parseError) {
        console.error('Error parsing account linking data:', parseError);
        setError('Account linking failed. Please try again.');
      }
    } else if (e) {
      const m = {
        CredentialsSignin: 'Invalid email or password',
        OAuthSignin: 'OAuth sign-in failed.',
        default: 'Login failed. Please try again.',
      };
      setError(m[e] || m.default);
    }
  }, [searchParams]);

  const redirectByRole = (role) => {
    if (!role) return router.push('/');
    switch (role.toLowerCase()) {
      case 'superadmin': return router.push('/super-admin/dashboard');
      case 'admin': return router.push('/admin/dashboard');
      case 'receptionist': return router.push('/receptionist');
      case 'amenityinventorymanager': return router.push('/amenityinventorymanager');
      case 'customer': return router.push('/guest/dashboard');
      default: return router.push('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      callbackUrl: searchParams.get('redirect') || searchParams.get('callbackUrl') || undefined,
    });
  };

  const handleOAuthLogin = async (provider) => {
    if (provider === 'google') {
      try {
        const callbackUrl = searchParams.get('redirect') || searchParams.get('callbackUrl') || undefined;
        const result = await handleGoogleSignInWithLinking(callbackUrl);
        
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
    } else {
      await signIn(provider, {
        callbackUrl: searchParams.get('redirect') || searchParams.get('callbackUrl') || undefined,
      });
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
        callbackUrl: searchParams.get('redirect') || searchParams.get('callbackUrl') || undefined,
      });
    } else {
      // Redirect to login form for password authentication
      router.push('/login');
    }
  };

  return (
    <>
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
      <div className="auth-page">
        {/* Background Elements */}
        <div className="bg-gradient"></div>
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
        
        <div className="auth-container">
          {/* Main Auth Card */}
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
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Sign in to your Charkool Beach Resort account</p>
            </div>
            {/* Form Section */}
            <div className="form-section">
              <div className="form-header">
                <h2 className="form-title">Sign In</h2>
              </div>

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="field-group">
                  <label className="field-label">Email Address *</label>
                  <div className="field-wrapper">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email address"
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Password *</label>
                  <div className="field-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="field-input"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="toggle-btn"
                    >
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/> }
                    </button>
                  </div>
                  <Link href="/login/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="primary-btn">
                  Sign In
                </button>
              </form>

              <div className="divider">
                <span>or</span>
              </div>

              <button 
                onClick={() => handleOAuthLogin('google')} 
                className="google-btn"
                type="button"
              >
                <FaGoogle size={20}/> 
                Continue with Google
              </button>

              <div className="auth-footer">
                <p>Don't have an account? <Link href="/register" className="auth-link">Sign Up</Link></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="divider"></div>
        <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
      </footer>



      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
          padding-top: 80px;
        }

        .bg-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            #fff7ed 0%, 
            #fed7aa 25%,
            #fdba74 50%,
            #fb923c 75%,
            #f59e0b 100%);
          opacity: 0.6;
          animation: gradientShift 10s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.6; }
        }

        .floating-shapes {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(1px);
        }

        .shape-1 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle at 30% 30%, rgba(251, 146, 60, 0.2), rgba(245, 158, 11, 0.1));
          top: -5%;
          left: -5%;
          animation: floatLarge 20s ease-in-out infinite;
        }

        .shape-2 {
          width: 200px;
          height: 200px;
          background: radial-gradient(circle at 70% 70%, rgba(217, 119, 6, 0.15), rgba(180, 83, 9, 0.08));
          top: 40%;
          right: -5%;
          animation: floatMedium 15s ease-in-out infinite reverse;
        }

        .shape-3 {
          width: 150px;
          height: 150px;
          background: radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.18), rgba(245, 158, 11, 0.05));
          bottom: 10%;
          left: 5%;
          animation: floatSmall 12s ease-in-out infinite;
        }

        .shape-4 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle at 40% 60%, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05));
          top: 15%;
          right: 20%;
          animation: floatLarge 18s ease-in-out infinite;
        }

        @keyframes floatLarge {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          25% { transform: translateY(-30px) translateX(20px) rotate(90deg); }
          50% { transform: translateY(-15px) translateX(-10px) rotate(180deg); }
          75% { transform: translateY(20px) translateX(-15px) rotate(270deg); }
        }

        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          33% { transform: translateY(-20px) translateX(15px) scale(1.1); }
          66% { transform: translateY(10px) translateX(-20px) scale(0.9); }
        }

        @keyframes floatSmall {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(-25px) rotate(180deg) scale(1.15); }
        }

        .auth-container {
          position: relative;
          z-index: 10;
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(30px);
          border-radius: 32px;
          padding: 2.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 
            0 32px 64px rgba(0, 0, 0, 0.12),
            0 16px 32px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.3);
          animation: cardEntrance 1s ease-out;
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
          margin-bottom: 2rem;
          position: relative;
        }

        .logo-image {
          border-radius: 20px;
          margin-bottom: 1rem;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          animation: logoFloat 6s ease-in-out infinite;
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
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
          line-height: 1.2;
          animation: titleGlow 3s ease-in-out infinite alternate;
        }

        @keyframes titleGlow {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.1); }
        }

        .auth-subtitle {
          font-size: 1rem;
          color: #64748b;
          font-weight: 500;
          line-height: 1.4;
          margin: 0 auto;
          max-width: 400px;
        }

        .form-section {
          width: 100%;
        }

        .form-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .form-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
          letter-spacing: -0.01em;
        }

        .form-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
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
          margin-bottom: 0.4rem;
          position: relative;
          transition: color 0.3s ease;
        }

        .field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          height: 48px;
          overflow: hidden;
        }

        .field-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.6s ease;
        }

        .field-wrapper:hover::before {
          left: 100%;
        }

        .field-wrapper:focus-within {
          border-color: #f59e0b;
          box-shadow: 
            0 0 0 4px rgba(245, 158, 11, 0.15),
            0 8px 32px rgba(245, 158, 11, 0.1);
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.95);
        }

        .field-icon {
          padding: 0.75rem 1.0rem; /* slightly tighter horizontal padding */
          color: #64748b;
          flex-shrink: 0;
          transition: all 0.3s ease;
          border-right: 1px solid #e2e8f0;
          background: rgba(248, 250, 252, 0.8);
          margin-right: 0; /* remove external margin; spacing handled by input padding */
        }

        .field-wrapper:focus-within .field-icon {
          color: #f59e0b;
          transform: scale(1.1);
        }

        .field-input {
          flex: 1;
          padding: 0.75rem 0.75rem 0.75rem 0.95rem; /* more left padding so text doesn't hug the icon */
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.95rem;
          color: #1e293b;
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        .field-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
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

        .forgot-link {
          align-self: flex-end;
          font-size: 0.875rem;
          color: #f59e0b;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .forgot-link:hover {
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

        .primary-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 6px 24px rgba(245, 158, 11, 0.3),
            0 3px 12px rgba(217, 119, 6, 0.2);
          margin-top: 1.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .primary-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.6s ease;
        }

        .primary-btn:hover::before {
          left: 100%;
        }

        .primary-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 12px 40px rgba(245, 158, 11, 0.4),
            0 8px 24px rgba(217, 119, 6, 0.3);
        }

        .primary-btn:active {
          transform: translateY(-1px) scale(0.98);
        }

        .divider {
          position: relative;
          text-align: center;
          margin: 1.25rem 0;
          color: #64748b;
          font-size: 0.85rem;
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
          padding: 0.875rem 1.25rem;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          color: #475569;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          height: 48px;
          position: relative;
          overflow: hidden;
        }

        .google-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(226, 232, 240, 0.3), transparent);
          transition: left 0.6s ease;
        }

        .google-btn:hover::before {
          left: 100%;
        }

        .google-btn:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .auth-footer {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.85rem;
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

        /* Responsive Design */
        @media (max-width: 768px) {
          .auth-container {
            padding: 1rem;
          }
          
          .auth-card {
            padding: 2rem 1.5rem;
          }
          
          .title {
            font-size: 1.75rem;
          }
          
          .logo-section {
            margin-bottom: 2rem;
          }
          
          .brand-name {
            font-size: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 1.5rem 1rem;
            border-radius: 16px;
          }
          
          .title {
            font-size: 1.5rem;
          }
          
          .form {
            gap: 1.25rem;
          }
          
          .field-input {
            padding: 0.875rem 0.875rem 0.875rem 2.75rem;
          }
        }

        .footer {
          background-color: rgba(232, 207, 163, 0.8);
          text-align: center;
          padding: 1.5rem 0;
          color: rgba(18, 50, 56, 0.85);
          font-size: 0.9rem;
          backdrop-filter: blur(10px);
        }

        .footer .divider {
          width: 80%;
          height: 1px;
          background-color: #d3b885;
          margin: 0 auto;
        }
        .brand-section {
          background: linear-gradient(135deg, 
            rgba(254, 243, 199, 0.9) 0%, 
            rgba(252, 211, 77, 0.9) 50%, 
            rgba(245, 158, 11, 0.9) 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 0;
          margin-top: 0;
          position: relative;
        }
        .login-card {
          width: min(880px, 94%);
          max-height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.98);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, rgba(255,246,230,1) 0%, rgba(255,242,213,1) 50%, rgba(254,243,199,1) 100%);
          padding: 32px 24px;
          text-align: center;
          position: relative;
        }
        .login-left::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="0.5" fill="%23f59e0b" opacity="0.05"/><circle cx="80" cy="40" r="0.3" fill="%23d97706" opacity="0.03"/><circle cx="40" cy="80" r="0.4" fill="%23f59e0b" opacity="0.04"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.6;
          z-index: 1;
        }
        .login-left > * {
          position: relative;
          z-index: 2;
        }
        .logo-img { 
          width: 160px; 
          height: auto; 
          margin-bottom: 20px;
          transition: transform 0.3s ease;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
        }
        .logo-img:hover {
          transform: scale(1.05);
        }
        .tagline { 
          font-size: 1.1rem; 
          color: #374151; 
          line-height: 1.5; 
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .login-right {
          flex: 1;
          padding: 18px;
          max-width: 100%
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #fff;
        }
        @media (min-width: 768px) {
          .login-card { flex-direction: row; }
          .login-left { padding: 30px; }
          .login-right { padding: 30px; }
        }
        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          text-align: center;
          color: #0f172a;
          margin: 0 0 18px 0;
          background: linear-gradient(135deg, #0f172a 0%, #374151 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-form { display: flex; flex-direction: column; gap: 10px; }
        .login-form label {
          font-size: 0.85rem;
          color: #334155;
          font-weight: 500;
          display: flex;
          flex-direction: column;
          gap: 6px;
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
          box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
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
          padding: 10px 12px;
          border: none;
          border-radius: 0;
          font-size: 0.9rem;
          background: transparent;
          transition: all 0.2s ease;
          width: 100%;
          font-weight: 400;
          box-sizing: border-box;
          outline: none;
          height: 42px;
        }
        .login-form input::placeholder {
          color: #9ca3af;
        }
        .password-box {
          position: relative;
        }
        .password-box input { 
          padding-right: 45px !important; 
        }
        .toggle-eye {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #9ca3af;
          transition: color 0.2s ease;
          pointer-events: auto;
          user-select: none;
        }
        .toggle-eye:hover {
          color: #f59e0b;
        }
        .toggle-eye:focus { outline: none; }
        .forgot-link {
          font-size: 0.85rem;
          color: #065f46;
          margin-top: 6px;
          text-align: right;
          text-decoration: none;
        }
        .primary-btn {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
          height: 46px;
          margin-top: 8px;
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
        .primary-btn:active {
          transform: translateY(0);
        }
        .error-text {
          margin-top: 8px;
          text-align: center;
          color: #dc2626;
          font-size: 0.9rem;
        }
        .google-btn {
          margin-top: 12px;
          width: 100%;
          padding: 12px 20px;
          background: #fff;
          color: #374151;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          height: 46px;
        }
        .google-btn:hover { 
          background: #f8fafc; 
          border-color: #d1d5db;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .signup-text {
          margin-top: 10px;
          text-align: center;
          font-size: 0.85rem;
          color: #374151;
        }
        .signup-text a { 
          color: #d97706; 
          text-decoration: none; 
          font-weight: 500;
        }
        
        .signup-text a:hover { 
          color: #f59e0b; 
          text-decoration: underline;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .auth-card {
            margin: 1rem;
            padding: 2rem;
          }
          
          .auth-title {
            font-size: 1.75rem;
          }
          
          .shape-1 { width: 150px; height: 150px; }
          .shape-2 { width: 120px; height: 120px; }
          .shape-3 { width: 80px; height: 80px; }
        }

        @media (max-width: 480px) {
          .auth-container {
            padding: 1rem 0.5rem;
          }
          
          .auth-card {
            margin: 0.5rem;
            padding: 1.5rem;
          }
          
          .auth-title {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
          }
          
          .auth-form {
            gap: 1rem;
          }
          
          .floating-shapes {
            display: none;
          }
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
      `}</style>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
