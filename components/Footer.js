import React from 'react';

export default function Footer() {
  return (
    <>
      <footer className="footer">
        <div className="divider"></div>
        <p>© 2025 Charkool Beach Resort. All Rights Reserved.</p>
      </footer>

      <style jsx>{`
        /* Footer Styles */
        .footer {
          padding: 2rem 1rem 1rem 1rem;
          text-align: center;
          color: #8B7355;
          font-size: 0.875rem;
          background: transparent;
        }

        .footer .divider {
          width: 60px;
          height: 3px;
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