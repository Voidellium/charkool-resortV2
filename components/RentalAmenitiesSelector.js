'use client';
import { useState, useEffect } from 'react';

export default function RentalAmenitiesSelector({
  selectedAmenities,
  onAmenitiesChange
}) {
  const [rentalAmenities, setRentalAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, []);

  const handleRentalChange = (amenityId, field, value) => {
    const newSelectedAmenities = { ...selectedAmenities };
    const currentSelection = newSelectedAmenities[amenityId] || { quantity: 0, hoursUsed: 0 };

    if (field === 'quantity') {
      if (value > 0) {
        newSelectedAmenities[amenityId] = {
          ...currentSelection,
          quantity: value
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
    if (hoursUsed > 0 && amenity.pricePerHour) {
      return hoursUsed * amenity.pricePerHour;
    }
    return quantity * amenity.pricePerUnit;
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
        {rentalAmenities.map((amenity) => {
          const currentSelection = selectedAmenities[amenity.id] || { quantity: 0, hoursUsed: 0 };
          const totalPrice = calculatePrice(amenity, currentSelection.quantity, currentSelection.hoursUsed);

          return (
            <div key={amenity.id} className="rental-card">
              <div className="rental-header">
                <h5 className="rental-name">{amenity.name}</h5>
                {amenity.description && (
                  <p className="rental-description">{amenity.description}</p>
                )}
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
                      disabled={currentSelection.quantity === 0}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={currentSelection.quantity}
                      onChange={(e) => handleRentalChange(amenity.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="quantity-input"
                    />
                    <button
                      type="button"
                      onClick={() => handleRentalChange(amenity.id, 'quantity', currentSelection.quantity + 1)}
                      className="quantity-btn"
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
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .rental-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-color: #fd7e14;
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
