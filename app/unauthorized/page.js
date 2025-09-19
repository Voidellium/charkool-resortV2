'use client';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleBackToLogin = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="unauthorized-content">
          <h1 className="unauthorized-title">You are unauthorized to access this account level</h1>
          <p className="unauthorized-message">
            It looks like you don't have the necessary permissions to view this page.
            Please contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={handleBackToLogin}
            className="back-to-login-button"
          >
            Back to Login
          </button>
        </div>
      </div>

      <style jsx>{`
        .unauthorized-container {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .unauthorized-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 500px;
          width: 100%;
          padding: 2rem;
          text-align: center;
        }

        .unauthorized-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .unauthorized-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1.2;
          margin: 0;
        }

        .unauthorized-message {
          font-size: 1.125rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        .back-to-login-button {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
          margin-top: 1rem;
        }

        .back-to-login-button:hover {
          background: #2563eb;
        }

        .back-to-login-button:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        @media (max-width: 640px) {
          .unauthorized-title {
            font-size: 2rem;
          }

          .unauthorized-message {
            font-size: 1rem;
          }

          .unauthorized-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
