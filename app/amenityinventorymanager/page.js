'use client';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { RefreshCw, User, Clock } from 'lucide-react';
import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
import { NavigationConfirmationModal } from '../../components/CustomModals';

export default function AmenityInventoryDashboard() {
  const { data: session } = useSession();
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Navigation Guard Setup for admin forms
  const navigationGuard = useNavigationGuard({
    trackForms: true,
    formId: 'amenity-inventory-dashboard',
    customMessage: 'Unsaved inventory changes will be lost. Please save your work before navigating away.'
  });

  // Logout Navigation Guard (always active for logout protection)
  const logoutGuard = useNavigationGuard({
    shouldPreventNavigation: () => true,
    onNavigationAttempt: () => {
      console.log('Amenity Manager Dashboard: Navigation attempt detected, showing logout confirmation');
    },
    customAction: () => signOut({ callbackUrl: '/login' }),
    context: 'logout',
    message: 'Are you sure you want to log out of your Amenity Manager dashboard?'
  });

  const fetchAmenities = async () => {
    try {
      setError('');
      const [optRes, rentRes] = await Promise.all([
        fetch('/api/amenities/optional'),
        fetch('/api/amenities/rental'),
      ]);
      if (!optRes.ok || !rentRes.ok) throw new Error('Failed to fetch amenities');
      const [optional, rental] = await Promise.all([optRes.json(), rentRes.json()]);
      const opt = (optional || []).map(a => ({ ...a, category: 'Optional' }));
      const rent = (rental || []).map(a => ({ ...a, category: 'Rental' }));
      const merged = [...opt, ...rent];
      // dedupe by category-id
      const seen = new Set();
      const unique = [];
      for (const a of merged) {
        const k = `${a.category}-${a.id ?? a.name?.toLowerCase()}`;
        if (!seen.has(k)) { seen.add(k); unique.push(a); }
      }
      setAmenities(unique);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not load amenities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    fetchAmenities();
  };

  if (loading)
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  if (error)
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );

  // KPIs
  const totalOptional = amenities.filter(a => a.category === 'Optional').length;
  const totalRental = amenities.filter(a => a.category === 'Rental').length;
  const totalStock = amenities.reduce((s, a) => s + (a.quantity || 0), 0);
  const lowStock = amenities.filter(a => (a.quantity ?? 0) < 5);

  return (
    <div style={styles.container}>
      {/* Background Decorative Elements */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>

      {/* Animated Gradient Overlay */}
      <div className="gradient-overlay"></div>

      {/* Welcome Section */}
      <div className="welcome-section" style={styles.welcomeSection}>
        <div className="welcome-content" style={styles.welcomeContent}>
          <div className="welcome-text" style={styles.welcomeText}>
            <User size={24} className="welcome-icon" style={styles.welcomeIcon} />
            <div>
              <h2 className="welcome-title" style={styles.welcomeTitle}>
                Welcome, Manager {session?.user?.name || session?.user?.email || 'User'}!
              </h2>
              <p style={styles.welcomeSubtitle}>
                <Clock size={16} style={{ marginRight: '8px' }} />
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
          <div style={styles.welcomeBadge}>
            Amenity Manager
          </div>
        </div>
      </div>

      <div className="header-row" style={styles.headerRow}>
        <h1 className="dashboard-title" style={styles.title}>Amenity Inventory Dashboard</h1>
        <button onClick={handleRefresh} className="refresh-button" style={styles.refreshButton}>
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={styles.kpiRow}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Optional Amenities</div>
          <div className="kpi-value" style={styles.kpiValue}>{totalOptional}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Rental Amenities</div>
          <div className="kpi-value" style={styles.kpiValue}>{totalRental}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Stock</div>
          <div className="kpi-value" style={styles.kpiValue}>{totalStock}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Low Stock</div>
          <div className="kpi-value" style={styles.kpiValue}>{lowStock.length}</div>
        </div>
      </div>

      {/* Low stock list */}
      <div className="panel" style={styles.panel}>
        <div style={styles.panelHeader}>Low Stock (less than 5)</div>
        {lowStock.length === 0 ? (
          <div style={styles.empty}>All good! No items are low.</div>
        ) : (
          <div className="grid" style={styles.grid}> 
            {lowStock.map(a => (
              <div key={`${a.category}-${a.id}`} style={styles.card}>
                <div style={styles.cardTitle}>{a.name}</div>
                <div style={styles.cardMeta}><span style={styles.badge}>{a.category}</span></div>
                <div style={styles.cardQty}>Qty: {a.quantity}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grouped lists */}
      <div className="panel" style={styles.panel}>
        <div style={styles.panelHeader}>All Amenities</div>
        {['Optional','Rental'].map(cat => {
          const list = amenities.filter(a => a.category === cat);
          return (
            <details key={cat} open style={{ marginBottom: 8 }}>
              <summary style={styles.summary}><span style={{ ...styles.badge, background: cat==='Optional' ? '#f59e0b' : '#10b981', color: 'white' }}>{cat}</span> <span style={{ color: '#6b7280' }}>({list.length})</span></summary>
              <div className="table-container" style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length > 0 ? (
                      list.map(a => (
                        <tr key={`${a.category}-${a.id}`} style={styles.tr}>
                          <td style={styles.td}>{a.name}</td>
                          <td style={styles.td}>{a.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center', padding: '16px' }}>No items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>
      
      {/* Form Changes Navigation Modal */}
      <NavigationConfirmationModal 
        show={navigationGuard.showModal}
        onStay={navigationGuard.handleStay}
        onLeave={navigationGuard.handleLeave}
        context="admin"
        message={navigationGuard.message}
      />

      {/* Logout Confirmation Modal */}
      <NavigationConfirmationModal 
        show={logoutGuard.showModal}
        onStay={logoutGuard.handleStay}
        onLeave={logoutGuard.handleLeave}
        context="logout"
        message={logoutGuard.message}
      />

      {/* CSS Animations and Responsive Styles */}
      <style jsx>{`
        /* Responsive Design Media Queries */
        @media (max-width: 768px) {
          .welcome-section {
            margin: 16px !important;
            padding: 20px !important;
          }
          
          .welcome-content {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          
          .welcome-text {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          
          .welcome-title {
            font-size: 1.5rem !important;
            line-height: 1.3 !important;
          }
          
          .welcome-icon {
            width: 48px !important;
            height: 48px !important;
            padding: 12px !important;
          }
          
          .header-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
            margin: 0 16px !important;
            padding: 16px 0 !important;
          }
          
          .dashboard-title {
            font-size: 2rem !important;
            text-align: center !important;
            width: 100% !important;
          }
          
          .refresh-button {
            width: 100% !important;
            justify-content: center !important;
          }
          
          .kpi-row {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            margin: 0 16px !important;
          }
          
          .panel {
            margin: 0 16px !important;
            padding: 20px !important;
          }
          
          .grid {
            grid-template-columns: 1fr !important;
          }
          
          .table-container {
            overflow-x: auto !important;
          }
          
          .floating-shapes {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          .welcome-title {
            font-size: 1.25rem !important;
          }
          
          .dashboard-title {
            font-size: 1.75rem !important;
          }
          
          .kpi-value {
            font-size: 2rem !important;
          }
          
          .welcome-section {
            margin: 12px !important;
            padding: 16px !important;
          }
          
          .kpi-row {
            margin: 0 12px !important;
          }
          
          .panel {
            margin: 0 12px !important;
            padding: 16px !important;
          }
          
          .header-row {
            margin: 0 12px !important;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .kpi-row {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          
          .welcome-title {
            font-size: 2rem !important;
          }
          
          .dashboard-title {
            font-size: 2.5rem !important;
          }
        }

        @media (min-width: 1025px) {
          .kpi-row {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        @keyframes buttonGradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .kpiCard::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% {
            left: -100%;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        .refreshButton:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4), 0 3px 12px rgba(245, 158, 11, 0.25);
          background-position: 100% 50%;
        }

        .panel:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 32px rgba(0,0,0,0.12), 0 3px 16px rgba(254, 190, 82, 0.15);
        }

        .kpiCard:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 36px rgba(0,0,0,0.15), 0 4px 18px rgba(245, 158, 11, 0.25);
        }

        .floating-shapes {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: -1;
        }

        .shape {
          position: absolute;
          background: linear-gradient(45deg, rgba(245, 158, 11, 0.1), rgba(254, 190, 82, 0.05));
          border-radius: 50%;
          animation: float 20s infinite ease-in-out;
        }

        .shape-1 {
          width: 120px;
          height: 120px;
          top: 20%;
          left: 10%;
          animation-delay: 0s;
        }

        .shape-2 {
          width: 80px;
          height: 80px;
          top: 60%;
          right: 15%;
          animation-delay: -8s;
        }

        .shape-3 {
          width: 150px;
          height: 150px;
          top: 80%;
          left: 70%;
          animation-delay: -16s;
        }

        .shape-4 {
          width: 100px;
          height: 100px;
          top: 30%;
          right: 40%;
          animation-delay: -12s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.2;
          }
          25% {
            transform: translateY(-10px) rotate(45deg);
            opacity: 0.1;
          }
          50% {
            transform: translateY(-15px) rotate(90deg);
            opacity: 0.2;
          }
          75% {
            transform: translateY(-8px) rotate(135deg);
            opacity: 0.1;
          }
        }

        .gradient-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, 
            rgba(245, 158, 11, 0.05) 0%, 
            rgba(254, 190, 82, 0.03) 25%,
            transparent 50%,
            rgba(245, 158, 11, 0.03) 75%,
            rgba(254, 190, 82, 0.05) 100%
          );
          background-size: 300% 300%;
          animation: gradientMove 12s ease-in-out infinite;
          pointer-events: none;
          z-index: -1;
        }

        @keyframes gradientMove {
          0%, 100% {
            background-position: 0% 0%;
          }
          25% {
            background-position: 100% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
          75% {
            background-position: 0% 100%;
          }
        }

        /* Touch-friendly styles for mobile */
        @media (hover: none) {
          .refreshButton:hover,
          .panel:hover,
          .kpiCard:hover {
            transform: none !important;
          }
          
          .refreshButton:active {
            transform: scale(0.98) !important;
          }
          
          .kpiCard:active {
            transform: scale(0.98) !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '0px',
    boxSizing: 'border-box',
    gap: '32px',
    position: 'relative',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 30%, #e2e8f0 60%, #f1f5f9 100%)',
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
    paddingBottom: '32px',
  },
  welcomeSection: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
    borderRadius: '24px',
    padding: '32px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(254, 190, 82, 0.2)',
    marginBottom: '24px',
    margin: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  welcomeContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  welcomeIcon: {
    color: '#ffffff',
    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
    padding: '16px',
    borderRadius: '50%',
    width: '56px',
    height: '56px',
    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4), 0 4px 12px rgba(245, 158, 11, 0.2)',
    border: '3px solid rgba(255, 255, 255, 0.3)',
  },
  welcomeTitle: {
    margin: '0 0 8px 0',
    fontSize: '2.2rem',
    fontWeight: '800',
    color: '#1f2937',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
    letterSpacing: '-0.5px',
  },
  welcomeSubtitle: {
    margin: '0',
    fontSize: '1rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  welcomeBadge: {
    background: '#f59e0b',
    color: 'white',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    padding: '20px 0',
    margin: '0 24px',
    position: 'relative',
    overflow: 'hidden',
  },
  title: {
    margin: '0',
    color: '#1f2937',
    fontSize: '3rem',
    fontWeight: '900',
    textShadow: '0 4px 8px rgba(0,0,0,0.1)',
    letterSpacing: '-0.5px',
    position: 'relative',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
    backgroundSize: '200% 200%',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4), 0 2px 8px rgba(245, 158, 11, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'relative',
    overflow: 'hidden',
    animation: 'buttonGradient 3s ease infinite',
  },
  tableContainer: {
    width: '100%',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    margin: '0 24px',
    position: 'relative',
  },
  kpiCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 50%, #ffffff 100%)',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 16px rgba(245, 158, 11, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  kpiLabel: { 
    color: '#6b7280', 
    fontWeight: 600,
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiValue: { 
    fontSize: '2.5rem', 
    fontWeight: 900,
    color: '#f59e0b',
  },
  panel: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 16px rgba(254, 190, 82, 0.1)',
    padding: '28px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
    margin: '0 24px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  panelHeader: { 
    fontSize: '1.25rem', 
    fontWeight: 700, 
    marginBottom: '16px',
    color: '#1f2937',
  },
  summary: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    cursor: 'pointer', 
    padding: '12px 0',
    fontWeight: 600,
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    marginBottom: '12px',
  },
  grid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
    gap: '16px' 
  },
  card: { 
    border: '1px solid #e5e7eb', 
    borderRadius: '12px', 
    padding: '16px',
    background: '#f9fafb',
    transition: 'all 0.3s ease',
  },
  cardTitle: { 
    fontWeight: 700,
    color: '#1f2937',
    fontSize: '16px',
  },
  cardMeta: { marginTop: 8 },
  badge: { 
    background: '#f59e0b', 
    borderRadius: 999, 
    padding: '4px 12px', 
    fontSize: 12, 
    fontWeight: 700,
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardQty: { 
    fontWeight: 700, 
    marginTop: 12,
    color: '#dc2626',
    fontSize: '14px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #febe52 0%, #f59e0b 100%)',
    borderBottom: '2px solid #f59e0b',
    textAlign: 'left',
    fontWeight: '700',
    color: 'white',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    color: '#374151',
    fontSize: '14px',
  },
  tr: {
    transition: 'background-color 0.2s ease',
  },
  empty: {
    textAlign: 'center',
    padding: '32px',
    color: '#6b7280',
    fontSize: '16px',
    fontStyle: 'italic',
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #FFE6B3 100%)',
  },
  loadingText: {
    fontSize: '1.5rem',
    color: '#374151',
    fontWeight: '600',
  },
  errorContainer: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #FFE6B3 100%)',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '1.2rem',
    fontWeight: '600',
  },
};
