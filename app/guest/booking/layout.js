'use client';
import GuestHeader from '../../../components/GuestHeader'; // Import the GuestHeader component

export default function GuestLayout({ children }) {
  return (
    <div className="layout-container">
      {/* Remove the inline <header> with the navbar and replace with GuestHeader */}
      <GuestHeader />
      
      <main className="main-content">
        {children}
      </main>

      {/* Keep the styles if they are needed for other parts of the layout, but the header styles are no longer necessary here */}
      <style jsx>{`
        .layout-container {
          background-color: #f0f2f5;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .main-content {
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}