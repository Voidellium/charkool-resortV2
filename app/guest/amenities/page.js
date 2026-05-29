'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePusher, CHANNELS, EVENTS } from '@/hooks/usePusher';
import { useToast } from '@/components/Toast';
import styles from './Amenities.module.css';

export default function AmenitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Bind to amenities channel for real-time stock updates
  usePusher(CHANNELS.AMENITIES, {
    [EVENTS.AMENITY_STOCK_CHANGED]: (data) => {
      if (data.type === 'optional') {
        setOptionalAmenities(prev =>
          prev.map(a => a.id === data.amenityId ? { ...a, quantity: data.quantity } : a)
        );
      } else if (data.type === 'rental') {
        setRentalAmenities(prev =>
          prev.map(a => a.id === data.amenityId ? { ...a, quantity: data.quantity } : a)
        );
      }
    }
  }, true);

  const Toast = useToast();
  
  const [optionalAmenities, setOptionalAmenities] = useState([]);
  const [rentalAmenities, setRentalAmenities] = useState([]);
  const [filter, setFilter] = useState('all'); // all | optional | rental
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageExtIndex, setImageExtIndex] = useState({});
  const [previewAmenity, setPreviewAmenity] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Auth check - redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch public amenities on mount
  useEffect(() => {
    fetchAmenities();
  }, []);

  // Real-time updates handled by usePusher hook above

  const fetchAmenities = async () => {
    try {
      setLoading(true);
      const [optionalRes, rentalRes] = await Promise.all([
        fetch('/api/amenities/optional/public'),
        fetch('/api/amenities/rental/public')
      ]);

      if (!optionalRes.ok || !rentalRes.ok) throw new Error('Failed to fetch');

      const optional = await optionalRes.json();
      const rental = await rentalRes.json();

      setOptionalAmenities(optional);
      setRentalAmenities(rental);
    } catch (error) {
      console.error('Failed to fetch amenities:', error);
      Toast.error('Failed to load amenities');
    } finally {
      setLoading(false);
    }
  };

  const excludedOptionalNames = new Set([
    'broom & dustpan',
    'extra bed',
    'toiletries kit'
  ]);
  const excludedRentalNames = new Set([
    'billiard access',
    'karaoke',
    'transportation service'
  ]);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];

  const getImageSrc = (name, index = 0) => {
    const ext = imageExtensions[index] || imageExtensions[0];
    return `/AmenityImage/${encodeURIComponent(name)}.${ext}`;
  };

  const handleImageError = (amenityName) => {
    setImageExtIndex((prev) => {
      const current = prev[amenityName] || 0;
      if (current + 1 >= imageExtensions.length) {
        return { ...prev, [amenityName]: -1 };
      }
      return { ...prev, [amenityName]: current + 1 };
    });
  };

  const openPreview = (amenity) => {
    setPreviewAmenity(amenity);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewAmenity(null);
  };

  // Filter logic
  const filteredOptional = optionalAmenities
    .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(a => !excludedOptionalNames.has(a.name.toLowerCase().trim()));

  const filteredRental = rentalAmenities
    .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(a => !excludedRentalNames.has(a.name.toLowerCase().trim()));

  // Room-included amenities (same for all room types)
  const roomIncludedAmenities = [
    { name: 'WiFi', icon: '📶', description: 'High-speed internet access' },
    { name: 'Pool Access', icon: '🏊', description: 'Resort swimming pool' },
    { name: 'Beach Access', icon: '🏖️', description: 'Private beach access' },
    { name: 'Parking', icon: '🅿️', description: 'Free parking available' },
    { name: 'Restaurant', icon: '🍽️', description: 'On-site dining' },
    { name: 'Reception', icon: '🏨', description: '24/7 reception desk' }
  ];

  // Stock status helper
  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { text: 'Unavailable', statusClass: 'stockOutOfStock', badge: '❌' };
    if (quantity <= 4) return { text: 'Few Available', statusClass: 'stockLowStock', badge: '🟡' };
    return { text: 'Available', statusClass: 'stockAvailable', badge: '✅' };
  };

  // Format price for rental amenities
  const formatPrice = (pricePerUnit, unitType) => {
    const price = (pricePerUnit / 100).toFixed(0);
    return `₱${price}/${unitType}`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading amenities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Resort Amenities</h1>
          <p className={styles.subtitle}>Browse all available amenities and services at Charkool Resort</p>
        </div>

        {/* Search Bar */}
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="🔍 Search amenities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Section 1: Room-Included Amenities */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={`${styles.sectionBadge} ${styles.sectionBadgeGreen}`}>✓</span>
            Included with Your Room (Free)
          </h2>
          <p className={styles.sectionDescription}>All rooms include these amenities complimentary</p>
          <div className={styles.grid}>
            {roomIncludedAmenities.map((amenity, idx) => (
              <div key={idx} className={styles.includedCard}>
                <div className={styles.includedIcon}>{amenity.icon}</div>
                <h3 className={styles.includedName}>{amenity.name}</h3>
                <p className={styles.includedDescription}>{amenity.description}</p>
                <div style={{ marginTop: '1rem' }}>
                  <span className={styles.includedBadge}>✓ Included</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Optional Add-ons */}
        {(filter === 'all' || filter === 'optional') && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={`${styles.sectionBadge} ${styles.sectionBadgeBlue}`}>+</span>
              Optional Add-ons (Free)
            </h2>
            <p className={styles.sectionDescription}>Enhance your stay with these optional amenities (no additional charge)</p>
            {filteredOptional.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No optional amenities found</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredOptional.map(amenity => {
                  const status = getStockStatus(amenity.quantity);
                  const imageIndex = imageExtIndex[amenity.name];
                  const showImage = imageIndex !== -1;
                  const imageSrc = showImage ? getImageSrc(amenity.name, imageIndex || 0) : null;

                  return (
                    <div key={amenity.id} className={styles.card}>
                      {showImage && (
                        <div className={styles.cardImageWrap}>
                          <img
                            src={imageSrc}
                            alt={amenity.name}
                            className={styles.cardImage}
                            onError={() => handleImageError(amenity.name)}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>📦</div>
                        <h3 className={styles.cardTitle}>{amenity.name}</h3>
                      </div>
                      <div className={styles.cardContent}>
                        {amenity.description && (
                          <div className={styles.cardContentItem}>
                            <p className={styles.cardDescription}>{amenity.description}</p>
                          </div>
                        )}
                        <div className={styles.cardContentItem}>
                          <div className={`${styles.stockBadge} ${styles[status.statusClass]}`}>
                            {status.badge} {status.text}
                          </div>
                        </div>
                        <div className={styles.cardContentItem}>
                          <div className={styles.chargeNote}>
                            No charge - Add during booking
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section 3: Rental Services */}
        {(filter === 'all' || filter === 'rental') && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={`${styles.sectionBadge} ${styles.sectionBadgeOrange}`}>💳</span>
              Rental Services (Paid Add-ons)
            </h2>
            <p className={styles.sectionDescription}>Rent equipment and services to make your stay more enjoyable</p>
            {filteredRental.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No rental services found</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredRental.map(amenity => {
                  const status = getStockStatus(amenity.quantity);
                  const imageIndex = imageExtIndex[amenity.name];
                  const showImage = imageIndex !== -1;
                  const imageSrc = showImage ? getImageSrc(amenity.name, imageIndex || 0) : null;

                  return (
                    <div key={amenity.id} className={styles.card}>
                      {showImage && (
                        <button
                          type="button"
                          className={styles.cardImageButton}
                          onClick={() => openPreview(amenity)}
                          aria-label={`Preview ${amenity.name}`}
                        >
                          <img
                            src={imageSrc}
                            alt={amenity.name}
                            className={styles.cardImage}
                            onError={() => handleImageError(amenity.name)}
                            loading="lazy"
                          />
                          <span className={styles.imageHint}>Tap to preview</span>
                        </button>
                      )}
                      <div className={`${styles.cardHeader} ${styles.rentalCardHeader}`}>
                        <div className={styles.cardIcon}>🎯</div>
                        <h3 className={styles.cardTitle}>{amenity.name}</h3>
                      </div>
                      <div className={styles.cardContent}>
                        {amenity.description && (
                          <div className={styles.cardContentItem}>
                            <p className={styles.cardDescription}>{amenity.description}</p>
                          </div>
                        )}
                        <div className={styles.cardContentItem}>
                          <div className={styles.priceText}>
                            {formatPrice(amenity.pricePerUnit, amenity.unitType)}
                          </div>
                        </div>
                        <div className={styles.cardContentItem}>
                          <div className={`${styles.stockBadge} ${styles[status.statusClass]}`}>
                            {status.badge} {status.text}
                          </div>
                        </div>
                        <div className={styles.cardContentItem}>
                          <div className={`${styles.chargeNote} ${styles.rentalChargeNote}`}>
                            Add during booking
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CTA Section */}
        <div className={styles.ctaSection}>
          <h3 className={styles.ctaTitle}>Ready to Book Your Stay?</h3>
          <p className={styles.ctaDescription}>Add your favorite amenities when you complete your booking</p>
          <Link href="/booking" className={styles.ctaButton}>
            Go to Booking →
          </Link>
        </div>

        {/* Info Footer removed per request */}
      </div>

      {isPreviewOpen && previewAmenity && (
        <div className={styles.previewOverlay} onClick={closePreview} role="dialog" aria-modal="true">
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.previewClose} onClick={closePreview} aria-label="Close preview">
              ×
            </button>
            <div className={styles.previewImageWrap}>
              <img
                src={getImageSrc(previewAmenity.name, imageExtIndex[previewAmenity.name] || 0)}
                alt={previewAmenity.name}
                className={styles.previewImage}
                onError={() => handleImageError(previewAmenity.name)}
              />
            </div>
            <div className={styles.previewDetails}>
              <h3 className={styles.previewTitle}>{previewAmenity.name}</h3>
              {previewAmenity.description && (
                <p className={styles.previewDescription}>{previewAmenity.description}</p>
              )}
              <div className={styles.previewMeta}>
                <span className={styles.previewPrice}>
                  {formatPrice(previewAmenity.pricePerUnit, previewAmenity.unitType)}
                </span>
                <span className={styles.previewStock}>
                  {getStockStatus(previewAmenity.quantity).text}
                </span>
              </div>
              <div className={styles.previewNote}>
                Add this rental during booking. Availability updates in real time.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
