'use client';
import { useEffect, useState } from 'react';

// Add card hover animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .amenity-card-hover:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      border-color: rgba(254, 190, 82, 0.3);
    }
  `;
  document.head.appendChild(style);
}

export default function CategorizationPage() {
  const [optional, setOptional] = useState([]);
  const [rental, setRental] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptional, setSelectedOptional] = useState('');
  const [selectedRental, setSelectedRental] = useState('');
  // read-only lists displayed side by side

  const fetchData = async () => {
    try {
      const [optRes, rentRes] = await Promise.all([
        fetch('/api/amenities/optional'),
        fetch('/api/amenities/rental'),
      ]);
      if (!optRes.ok || !rentRes.ok) throw new Error('Failed to load amenities');
      const [opt, rent] = await Promise.all([optRes.json(), rentRes.json()]);
      setOptional(opt || []);
      setRental(rent || []);
    } catch (e) {
      console.error(e);
      setError('Could not load amenities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Amenity Categorization</h1>
      <p style={styles.description}>Browse amenities organized by category with detailed information</p>
      
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading amenities...</p>
        </div>
      ) : (
        <div style={styles.categoriesContainer}>
          {/* Optional Amenities Section */}
          <div style={styles.categorySection}>
            <div style={styles.categoryHeader}>
              <div style={styles.categoryTitleRow}>
                <span style={styles.badge}>Optional Amenities</span>
                <span style={styles.count}>{optional.length} items</span>
              </div>
              <p style={styles.categoryDescription}>
                Free amenities available for guests to enhance their stay experience
              </p>
            </div>
            
            <div style={styles.cardsGrid}>
              {optional.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No optional amenities available</p>
                </div>
              ) : (
                optional.map(amenity => (
                  <div key={amenity.id} style={styles.amenityCard} className="amenity-card-hover">
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{amenity.name}</h3>
                      <span style={styles.optionalBadge}>Free</span>
                    </div>
                    {amenity.description && (
                      <p style={styles.cardDescription}>{amenity.description}</p>
                    )}
                    <div style={styles.cardFooter}>
                      <div style={styles.quantityInfo}>
                        <span style={styles.quantityLabel}>Available:</span>
                        <span style={styles.quantityValue}>{amenity.quantity || 0}</span>
                      </div>
                      {amenity.maxQuantity && (
                        <div style={styles.maxQuantityInfo}>
                          <span style={styles.maxLabel}>Max per booking:</span>
                          <span style={styles.maxValue}>{amenity.maxQuantity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rental Amenities Section */}
          <div style={styles.categorySection}>
            <div style={styles.categoryHeader}>
              <div style={styles.categoryTitleRow}>
                <span style={{ ...styles.badge, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  Rental Services
                </span>
                <span style={styles.count}>{rental.length} items</span>
              </div>
              <p style={styles.categoryDescription}>
                Premium services and equipment available for rent during your stay
              </p>
            </div>
            
            <div style={styles.cardsGrid}>
              {rental.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No rental services available</p>
                </div>
              ) : (
                rental.map(amenity => (
                  <div key={amenity.id} style={styles.amenityCard} className="amenity-card-hover">
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{amenity.name}</h3>
                      <span style={styles.rentalBadge}>Rental</span>
                    </div>
                    {amenity.description && (
                      <p style={styles.cardDescription}>{amenity.description}</p>
                    )}
                    <div style={styles.pricingInfo}>
                      {amenity.pricePerUnit && (
                        <div style={styles.priceRow}>
                          <span style={styles.priceLabel}>Unit Price:</span>
                          <span style={styles.priceValue}>
                            ₱{(amenity.pricePerUnit / 100).toFixed(0)} per {amenity.unitType || 'unit'}
                          </span>
                        </div>
                      )}
                      {amenity.pricePerHour && (
                        <div style={styles.priceRow}>
                          <span style={styles.priceLabel}>Hourly Rate:</span>
                          <span style={styles.priceValue}>
                            ₱{(amenity.pricePerHour / 100).toFixed(0)} per hour
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={styles.cardFooter}>
                      <div style={styles.quantityInfo}>
                        <span style={styles.quantityLabel}>Available:</span>
                        <span style={styles.quantityValue}>{amenity.quantity || 0}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { 
    padding: '24px', 
    maxWidth: '1200px', 
    margin: '0 auto',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  title: { 
    textAlign: 'center', 
    margin: '0 0 8px 0', 
    color: '#1f2937',
    fontSize: '2.5rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #febe52 0%, #f59e0b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  description: {
    textAlign: 'center',
    margin: '0 0 32px 0',
    color: '#6b7280',
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  categoriesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  categorySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  categoryHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  categoryTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: { 
    background: 'linear-gradient(135deg, #febe52 0%, #f59e0b 100%)', 
    color: '#fff', 
    borderRadius: 999, 
    padding: '8px 20px', 
    fontWeight: 700,
    fontSize: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  count: { 
    fontWeight: 600, 
    fontSize: '1.1rem',
    color: '#6b7280',
  },
  categoryDescription: {
    margin: '0',
    color: '#6b7280',
    fontSize: '1rem',
    fontStyle: 'italic',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  amenityCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  cardTitle: {
    margin: '0',
    color: '#1f2937',
    fontSize: '1.25rem',
    fontWeight: '700',
    flex: 1,
    marginRight: '12px',
  },
  optionalBadge: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  rentalBadge: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardDescription: {
    margin: '0 0 20px 0',
    color: '#6b7280',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  cardFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6',
  },
  quantityInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityLabel: {
    color: '#6b7280',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  quantityValue: {
    color: '#1f2937',
    fontSize: '1rem',
    fontWeight: '700',
  },
  maxQuantityInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maxLabel: {
    color: '#6b7280',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  maxValue: {
    color: '#f59e0b',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  pricingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
    padding: '16px',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    borderRadius: '12px',
    border: '1px solid #e0f2fe',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: '#0369a1',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  priceValue: {
    color: '#0c4a6e',
    fontSize: '1rem',
    fontWeight: '700',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
    fontSize: '1.1rem',
    fontStyle: 'italic',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #febe52',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '500',
    margin: '0',
  },
};
