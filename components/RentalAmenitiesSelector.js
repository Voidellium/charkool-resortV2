'use client';
import { useState, useEffect } from 'react';
import { calculateRentalAmenityTotalCents } from '@/src/lib/rentalPricing';

export default function RentalAmenitiesSelector({
  selectedAmenities,
  onAmenitiesChange,
  amenities = null
}) {
  const [rentalAmenities, setRentalAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Array.isArray(amenities)) {
      setRentalAmenities(amenities);
      setLoading(false);
      setError('');
      return;
    }

    const loadRentalAmenities = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/amenities/rental');

        if (response.ok) {
          const data = await response.json();
          setRentalAmenities(data);
        } else {
          setError('Failed to load rental amenities');
        }
      } catch (err) {
        console.error('Error loading rental amenities:', err);
        setError('Failed to load rental amenities');
      } finally {
        setLoading(false);
      }
    };

    loadRentalAmenities();
  }, [amenities]);

  useEffect(() => {
    let hasAdjustment = false;
    const adjusted = { ...selectedAmenities };

    for (const amenity of rentalAmenities) {
      const key = String(amenity.id);
      const selected = selectedAmenities[key] || selectedAmenities[amenity.id] || { quantity: 0, hoursUsed: 0 };
      const quantity = Number(selected.quantity) || 0;
      const available = Number.isFinite(Number(amenity.quantity)) ? Math.max(0, Number(amenity.quantity)) : 0;
      const clamped = Math.max(0, Math.min(quantity, available));

      if (clamped !== quantity) {
        hasAdjustment = true;
        if (clamped > 0) {
          adjusted[amenity.id] = { ...selected, quantity: clamped };
        } else {
          delete adjusted[amenity.id];
          delete adjusted[key];
        }
      }
    }

    if (hasAdjustment) {
      onAmenitiesChange(adjusted);
    }
  }, [onAmenitiesChange, rentalAmenities, selectedAmenities]);

  const handleRentalChange = (amenityId, field, value) => {
    const amenity = rentalAmenities.find((item) => item.id === amenityId);
    const available = amenity && Number.isFinite(Number(amenity.quantity))
      ? Math.max(0, Number(amenity.quantity))
      : 0;
    const newSelectedAmenities = { ...selectedAmenities };
    const currentSelection = newSelectedAmenities[amenityId] || { quantity: 0, hoursUsed: 0 };

    if (field === 'quantity') {
      const normalizedValue = Math.max(0, Math.min(value, available));
      if (normalizedValue > 0) {
        newSelectedAmenities[amenityId] = {
          ...currentSelection,
          quantity: normalizedValue
        };
      } else {
        delete newSelectedAmenities[amenityId];
      }
    } else if (field === 'hoursUsed') {
      if (currentSelection.quantity > 0) {
        newSelectedAmenities[amenityId] = {
          ...currentSelection,
          hoursUsed: Math.max(0, value)
        };
      }
    }

    onAmenitiesChange(newSelectedAmenities);
  };

  const calculatePrice = (amenity, quantity, hoursUsed) => {
    return calculateRentalAmenityTotalCents({ quantity, hoursUsed, rentalAmenity: amenity });
  };

  if (loading) {
    return (
      <div className="rental-amenities-loading">
        <p>Loading rental services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rental-amenities-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (rentalAmenities.length === 0) {
    return (
      <div className="rental-amenities-empty">
        <p>No rental services available.</p>
      </div>
    );
  }

  return (
    <div className="rental-amenities-selector">
      <h4>Rental Services</h4>
      <p className="section-description">
        Rent equipment and services for your stay
      </p>

      <div className="amenities-grid">
        {rentalAmenities
          .filter(amenity => {
            const name = amenity.name.toLowerCase();
            return !name.includes('billiard') && !name.includes('karaoke') && !name.includes('transportation');
          })
          .map((amenity) => {
          const currentSelection = selectedAmenities[amenity.id] || selectedAmenities[String(amenity.id)] || { quantity: 0, hoursUsed: 0 };
          const available = Number.isFinite(Number(amenity.quantity)) ? Math.max(0, Number(amenity.quantity)) : 0;
          const isUnavailable = available <= 0;
          const isLowAvailability = !isUnavailable && available <= 3;
          const totalPrice = calculatePrice(amenity, currentSelection.quantity, currentSelection.hoursUsed);

          return (
            <div key={amenity.id} className={`rental-card ${isUnavailable ? 'unavailable' : ''}`}>
              <div className="rental-header">
                <h5 className="rental-name">{amenity.name}</h5>
                {amenity.description && (
                  <p className="rental-description">{amenity.description}</p>
                )}
                <p className={`availability-status ${isUnavailable ? 'unavailable' : isLowAvailability ? 'low' : 'available'}`}>
                  {isUnavailable ? 'Unavailable' : isLowAvailability ? `Only ${available} left` : `${available} available`}
                </p>
              </div>

              <div className="pricing-info">
                <div className="price-breakdown">
                  <span className="unit-price">
                    ₱{(amenity.pricePerUnit / 100).toFixed(0)} per {amenity.unitType}
                  </span>
                  {amenity.pricePerHour && (
                    <span className="hourly-price">
                      ₱{(amenity.pricePerHour / 100).toFixed(0)} per hour
                    </span>
                  )}
                </div>
                {amenity.unitNote && (
                  <p className="unit-note">{amenity.unitNote}</p>
                )}
              </div>

              <div className="rental-controls">
                <div className="quantity-control">
                  <label className="control-label">Quantity:</label>
                  <div className="quantity-input-group">
                    <button
                      type="button"
                      onClick={() => handleRentalChange(amenity.id, 'quantity', currentSelection.quantity - 1)}
                      className="quantity-btn"
                      disabled={currentSelection.quantity === 0 || isUnavailable}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={currentSelection.quantity}
                      onChange={(e) => handleRentalChange(amenity.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="quantity-input"
                      disabled={isUnavailable}
                    />
                    <button
                      type="button"
                      onClick={() => handleRentalChange(amenity.id, 'quantity', currentSelection.quantity + 1)}
                      className="quantity-btn"
                      disabled={currentSelection.quantity >= available || isUnavailable}
                    >
                      +
                    </button>
                  </div>
                </div>

                {amenity.pricePerHour && currentSelection.quantity > 0 && (
                  <div className="hours-control">
                    <label className="control-label">Hours:</label>
                    <input
                      type="number"
                      min="0"
                      value={currentSelection.hoursUsed}
                      onChange={(e) => handleRentalChange(amenity.id, 'hoursUsed', parseInt(e.target.value) || 0)}
                      className="hours-input"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {currentSelection.quantity > 0 && (
                <div className="rental-summary">
                  <div className="summary-row">
                    <span>Quantity: {currentSelection.quantity}</span>
                    {currentSelection.hoursUsed > 0 && (
                      <span>Hours: {currentSelection.hoursUsed}</span>
                    )}
                  </div>
                  <div className="total-price">
                    Total: ₱{(totalPrice / 100).toFixed(0)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .rental-amenities-selector {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #fd7e14;
        }

        .rental-amenities-selector h4 {
          color: #fd7e14;
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .section-description {
          color: #666;
          margin: 0 0 20px 0;
          font-size: 14px;
        }

        .amenities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .rental-card {
          background: transparent;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.3s ease;
        }

        .rental-card:hover {
          box-shadow: 0 2px 8px rgba(253, 126, 20, 0.15);
          border-color: rgba(253, 126, 20, 0.3);
          background: rgba(253, 126, 20, 0.05);
        }

        .rental-card:has(.rental-summary) {
          background: linear-gradient(135deg, rgba(253, 126, 20, 0.08), rgba(253, 126, 20, 0.04));
          border-color: #fd7e14;
          box-shadow: 0 4px 12px rgba(253, 126, 20, 0.25);
        }

        .rental-card.unavailable {
          opacity: 0.7;
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .rental-header {
          margin-bottom: 12px;
        }

        .rental-name {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .rental-description {
          margin: 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }

        .availability-status {
          margin: 8px 0 0 0;
          font-size: 12px;
          font-weight: 600;
        }

        .availability-status.available {
          color: #166534;
        }

        .availability-status.low {
          color: #b45309;
        }

        .availability-status.unavailable {
          color: #b91c1c;
        }

        .pricing-info {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .price-breakdown {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .unit-price {
          font-size: 14px;
          font-weight: 600;
          color: #fd7e14;
        }

        .hourly-price {
          font-size: 12px;
          color: #666;
        }

        .unit-note {
          font-size: 12px;
          color: #666;
          font-style: italic;
          margin-top: 4px;
        }

        .rental-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .control-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .quantity-control {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .quantity-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quantity-btn {
          width: 32px;
          height: 32px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          color: #fd7e14;
          transition: all 0.2s ease;
        }

        .quantity-btn:hover:not(:disabled) {
          background: #fd7e14;
          color: white;
        }

        .quantity-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quantity-input {
          width: 60px;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
          font-weight: 600;
        }

        .hours-control {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .hours-input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
          font-weight: 600;
          width: 100%;
        }

        .rental-summary {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e0e0e0;
          background: #f8f9fa;
          border-radius: 4px;
          padding: 8px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .total-price {
          font-size: 14px;
          font-weight: 600;
          color: #fd7e14;
          text-align: right;
        }

        .rental-amenities-loading,
        .rental-amenities-error,
        .rental-amenities-empty {
          padding: 20px;
          text-align: center;
          color: #666;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #fd7e14;
        }

        .rental-amenities-error {
          border-left-color: #dc3545;
          color: #dc3545;
        }

        @media (max-width: 768px) {
          .amenities-grid {
            grid-template-columns: 1fr;
          }

          .quantity-input-group {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
