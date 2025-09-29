'use client';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { FaGoogle } from 'react-icons/fa6';
import { Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      const redirectUrl = searchParams.get('redirect') || searchParams.get('callbackUrl');
      if (redirectUrl && !redirectUrl.includes('/login')) router.push(redirectUrl);
      else redirectByRole(session?.user?.role);
    }
  }, [status, session, router, searchParams]);

  useEffect(() => {
    const e = searchParams.get('error');
    if (e) {
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
    await signIn(provider, {
      callbackUrl: searchParams.get('redirect') || searchParams.get('callbackUrl') || undefined,
    });
  };

  return (
    <>
      <div className="login-wrapper">
        <div className="login-card" role="dialog" aria-labelledby="login-title">
          <div className="login-left">
            <Image
              src="/images/logo.png"
              alt="Charkool Logo"
              width={280}
              height={280}
              className="logo-img"
              style={{ objectFit: 'contain', aspectRatio: '1 / 1', width: '280px', height: '280px', borderRadius: '20px' }}
              priority
            />
            <p className="tagline">Escape to Paradise at<br/>Charkool Leisure Beach Resort</p>
          </div>
          <div className="login-right">
            <h2 id="login-title" className="login-title">Welcome Back</h2>
            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <div className="password-box">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    inputMode="text"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="toggle-eye" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/> }
                  </button>
                </div>
                <Link href="/login/forgot-password" className="forgot-link">Forgot Password?</Link>
              </label>
              <button type="submit" className="primary-btn">Log In</button>
            </form>
            {error && <p className="error-text">{error}</p>}
            <button onClick={() => handleOAuthLogin('google')} className="google-btn" type="button">
              <FaGoogle/> Sign in with Google
            </button>
            <p className="signup-text">
              Don’t have an account? <Link href="/register">Sign up</Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root, html, body, #__next {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        * { box-sizing: border-box; }
        body {
          background: linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        #__next > div { height: 100%; }
      `}</style>

      <style jsx>{`
        .login-wrapper {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-card {
          width: min(860px, 94%);
          max-height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.96);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 14px 36px rgba(15,23,42,0.15);
        }
        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(255,246,230,1), rgba(255,242,213,1));
          padding: 24px;
          text-align: center;
        }
        .logo-img { width: 150px; height: auto; margin-bottom: 12px; }
        .tagline { font-size: 1rem; color: #374151; line-height: 1.4; }
        .login-right {
          flex: 1;
          padding: 20px;
          max-width: 100%
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #fff;
        }
        @media (min-width: 768px) {
          .login-card { flex-direction: row; }
          .login-left { padding: 36px; }
          .login-right { padding: 36px; }
        }
        .login-title {
          font-size: 1.8rem;
          font-weight: 700;
          text-align: center;
          color: #0f172a;
          margin: 0 0 18px 0;
        }
        .login-form { display: flex; flex-direction: column; gap: 12px; }
        .login-form label {
          font-size: 0.9rem;
          color: #334155;
          font-weight: 500;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .login-form input {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          background: #fff;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-form input:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 4px rgba(245,158,11,0.08);
        }
        .password-box { position: relative; display: flex; align-items: center; }
        .password-box input { width: 100%; padding-right: 40px; }
        .toggle-eye {
          position: absolute;
          right: 8px;
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
          padding: 10px 12px;
          background-color: #f59e0b;
          color: white;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.15s, transform 0.06s;
        }
        .primary-btn:hover { background-color: #d97706; transform: translateY(-1px); }
        .error-text {
          margin-top: 8px;
          text-align: center;
          color: #dc2626;
          font-size: 0.9rem;
        }
        .google-btn {
          margin-top: 10px;
          width: 100%;
          padding: 10px 12px;
          background: #fff;
          color: #111827;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }
        .google-btn:hover { background: #f8fafc; }
        .signup-text {
          margin-top: 12px;
          text-align: center;
          font-size: 0.9rem;
          color: #374151;
        }
        .signup-text a { color: #d97706; text-decoration: none; }
        @media (max-width: 420px) {
          .login-card { border-radius: 0; box-shadow: none; height: 100vh; }
          .login-right { padding: 14px; }
          .login-title { font-size: 1.4rem; margin-bottom: 12px; }
          .logo-img { width: 120px; }
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
