'use client';
import { useState, useEffect } from 'react';

export default function OptionalAmenitiesSelector({
  selectedAmenities,
  onAmenitiesChange
}) {
  const [optionalAmenities, setOptionalAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOptionalAmenities = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/amenities/optional');

        if (response.ok) {
          const data = await response.json();
          setOptionalAmenities(data);
        } else {
          setError('Failed to load optional amenities');
        }
      } catch (err) {
        console.error('Error loading optional amenities:', err);
        setError('Failed to load optional amenities');
      } finally {
        setLoading(false);
      }
    };

    loadOptionalAmenities();
  }, []);

  const handleQuantityChange = (amenityId, newQuantity) => {
    const amenity = optionalAmenities.find(a => a.id === amenityId);
    if (!amenity) return;

    // Ensure quantity doesn't exceed maxQuantity
    const clampedQuantity = Math.max(0, Math.min(newQuantity, amenity.maxQuantity));

    const newSelectedAmenities = { ...selectedAmenities };

    if (clampedQuantity > 0) {
      newSelectedAmenities[amenityId] = clampedQuantity;
    } else {
      delete newSelectedAmenities[amenityId];
    }

    onAmenitiesChange(newSelectedAmenities);
  };

  const incrementQuantity = (amenityId) => {
    const currentQuantity = selectedAmenities[amenityId] || 0;
    handleQuantityChange(amenityId, currentQuantity + 1);
  };

  const decrementQuantity = (amenityId) => {
    const currentQuantity = selectedAmenities[amenityId] || 0;
    handleQuantityChange(amenityId, currentQuantity - 1);
  };

  if (loading) {
    return (
      <div className="optional-amenities-loading">
        <p>Loading optional amenities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="optional-amenities-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (optionalAmenities.length === 0) {
    return (
      <div className="optional-amenities-empty">
        <p>No optional amenities available.</p>
      </div>
    );
  }

  return (
    <div className="optional-amenities-selector">
      <h4>Optional Add-ons</h4>
      <p className="section-description">
        Select additional amenities to enhance your stay
      </p>

      <div className="amenities-grid">
        {optionalAmenities.map((amenity) => {
          const currentQuantity = selectedAmenities[amenity.id] || 0;

          return (
            <div key={amenity.id} className="amenity-card">
              <div className="amenity-header">
                <h5 className="amenity-name">{amenity.name}</h5>
                {amenity.description && (
                  <p className="amenity-description">{amenity.description}</p>
                )}
              </div>

              <div className="amenity-controls">
                <div className="quantity-info">
                  <span className="quantity-label">Quantity:</span>
                  <span className="max-quantity">Max: {amenity.maxQuantity}</span>
                </div>

                <div className="quantity-selector">
                  <button
                    type="button"
                    onClick={() => decrementQuantity(amenity.id)}
                    className="quantity-btn"
                    disabled={currentQuantity === 0}
                  >
                    −
                  </button>

                  <span className="quantity-value">{currentQuantity}</span>

                  <button
                    type="button"
                    onClick={() => incrementQuantity(amenity.id)}
                    className="quantity-btn"
                    disabled={currentQuantity >= amenity.maxQuantity}
                  >
                    +
                  </button>
                </div>
              </div>

              {currentQuantity > 0 && (
                <div className="selection-indicator">
                  <span className="selected-text">
                    {currentQuantity} selected
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .optional-amenities-selector {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }

        .optional-amenities-selector h4 {
          color: #007bff;
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
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .amenity-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .amenity-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-color: #007bff;
        }

        .amenity-header {
          margin-bottom: 16px;
        }

        .amenity-name {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .amenity-description {
          margin: 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }

        .amenity-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .quantity-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .quantity-label {
          font-size: 12px;
          font-weight: 600;
          color: #333;
        }

        .max-quantity {
          font-size: 11px;
          color: #666;
        }

        .quantity-selector {
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
          color: #007bff;
          transition: all 0.2s ease;
        }

        .quantity-btn:hover:not(:disabled) {
          background: #007bff;
          color: white;
        }

        .quantity-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quantity-value {
          min-width: 40px;
          text-align: center;
          font-weight: 600;
          font-size: 16px;
        }

        .selection-indicator {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e0e0e0;
        }

        .selected-text {
          font-size: 12px;
          font-weight: 600;
          color: #28a745;
        }

        .optional-amenities-loading,
        .optional-amenities-error,
        .optional-amenities-empty {
          padding: 20px;
          text-align: center;
          color: #666;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }

        .optional-amenities-error {
          border-left-color: #dc3545;
          color: #dc3545;
        }

        @media (max-width: 768px) {
          .amenities-grid {
            grid-template-columns: 1fr;
          }

          .amenity-controls {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .quantity-selector {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
