'use client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export default function AmenityManagerLayout({ children }) {
  const router = useRouter();
  const currentPath = usePathname();

  const navItems = [
    { name: 'Amenities', href: '/amenityinventorymanager/amenities' },
    { name: 'Categorization', href: '/amenityinventorymanager/categorization' },
    { name: 'Usage Logs', href: '/amenityinventorymanager/logs' },
  ];

  const primaryColor = '#FEBE52'; // Primary color
  const secondaryColor = '#574B37';
  const accentColor = '#000000ff';
  const neutralColor = '#7D7464';
  const darkColor = '#42351F';

  const getContrastingColor = (bgColor) => {
    const color = bgColor.charAt(0) === '#' ? bgColor.substring(1) : bgColor;
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000' : '#fff';
  };

  const sidebarFontColor = getContrastingColor(primaryColor);
  const mainContentFontColor = getContrastingColor('#FBE7E8');

  return (
    <div
      style={{
        display: 'flex',
  height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        fontFamily: `'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
        overflow: 'hidden',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '300px',
          height: '100vh',
          backgroundColor: primaryColor,
          padding: '40px 30px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
        }}
      >
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '40px',
            letterSpacing: '0.05em',
            color: accentColor,
            textAlign: 'center',
          }}
        >
          Amenity Manager
        </h2>

        {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {navItems.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '10px',
                    background: isActive ? '#fff8e1' : 'transparent',
                    color: isActive ? accentColor : sidebarFontColor,
                    fontWeight: '700',
                    fontSize: '1.2rem',
                    textDecoration: 'none',
                    transition: 'background 0.2s, color 0.2s',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = secondaryColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isActive ? '#fff8e1' : 'transparent';
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: accentColor,
                        marginRight: 6,
                        boxShadow: '0 0 8px 2px #FEBE52',
                        animation: 'pulse 1.2s infinite',
                      }}
                    />
                  )}
                  {item.name}
                  <style>{`
                    @keyframes pulse {
                      0% { box-shadow: 0 0 0 0 #FEBE52; }
                      70% { box-shadow: 0 0 0 8px rgba(254,190,82,0); }
                      100% { box-shadow: 0 0 0 0 #FEBE52; }
                    }
                  `}</style>
                </Link>
              );
            })}
          </nav>
      </aside>

      {/* Main Content Area */}
      <main
        style={{
          marginLeft: '300px',
          width: 'calc(100vw - 300px)',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '50px',
          boxSizing: 'border-box',
          overflow: 'auto', // Only main scroll area
          background: '#FFF8E1', // subtle background for contrast
          position: 'relative',
        }}
      >
        {/* User Icon Dropdown at Top Right */}
        <div style={{ position: 'absolute', top: 30, right: 40, zIndex: 100 }}>
          <div id="user-menu-container" style={{ position: 'relative' }}>
            <button
              id="user-menu-button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                transition: 'box-shadow 0.2s',
              }}
              onClick={() => {
                const menu = document.getElementById('user-dropdown-menu');
                if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
              }}
              aria-label="User menu"
            >
              {/* User SVG Icon */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#42351F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
              </svg>
            </button>
            <div
              id="user-dropdown-menu"
              style={{
                display: 'none',
                position: 'absolute',
                top: 56,
                right: 0,
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                minWidth: 160,
                zIndex: 100,
                padding: '8px 0',
              }}
            >
              <button
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: '1rem',
                  color: '#B00020',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  document.getElementById('user-dropdown-menu').style.display = 'none';
                  if (window.confirm('Are you sure you want to log out?')) {
                    signOut();
                  }
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}