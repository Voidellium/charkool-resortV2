'use client';
import { useState, useEffect } from 'react';

export default function OptionalAmenitiesSelector({
  selectedAmenities,
  onAmenitiesChange,
  excludedAmenityNames = []
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
          // Filter out "Extra Bed" as it's automatically handled by additional pax,
          // plus any per-page exclusions passed via props.
          const excludedSet = new Set(
            excludedAmenityNames.map((name) => name.toLowerCase().trim())
          );
          excludedSet.add('extra bed');

          const filtered = data.filter((amenity) => {
            const normalizedName = (amenity.name || '').toLowerCase().trim();
            return !excludedSet.has(normalizedName);
          });
          setOptionalAmenities(filtered);
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
          const isBroomDustpan = amenity.name.toLowerCase().includes('broom') && amenity.name.toLowerCase().includes('dustpan');

          return (
            <div key={amenity.id} className="amenity-card">
              <div className="amenity-header">
                <h5 className="amenity-name">{amenity.name}</h5>
                {amenity.description && !isBroomDustpan && (
                  <p className="amenity-description">{amenity.description}</p>
                )}
                {isBroomDustpan && amenity.description && (
                  <p className="amenity-description">
                    {amenity.description.replace(/\(Quantity:.*?\)/i, '').trim()}
                  </p>
                )}
              </div>

              {isBroomDustpan ? (
                // Special handling for Broom & Dustpan - checkbox only, no quantity
                <div className="amenity-controls">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={currentQuantity > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onAmenitiesChange({ ...selectedAmenities, [amenity.id]: 1 });
                        } else {
                          const newAmenities = { ...selectedAmenities };
                          delete newAmenities[amenity.id];
                          onAmenitiesChange(newAmenities);
                        }
                      }}
                    />
                    <span className="checkbox-label">
                      {currentQuantity > 0 ? 'Selected' : 'Select this amenity'}
                    </span>
                  </label>
                </div>
              ) : (
                // Normal quantity selector for other amenities
                <>
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
                </>
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
          background: transparent;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.3s ease;
        }

        .amenity-card:hover {
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
          border-color: rgba(0, 123, 255, 0.3);
          background: rgba(0, 123, 255, 0.05);
        }

        .amenity-card:has(.selection-indicator) {
          background: linear-gradient(135deg, rgba(0, 123, 255, 0.08), rgba(0, 123, 255, 0.04));
          border-color: #007bff;
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.25);
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

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 8px 0;
        }

        .checkbox-container input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #007bff;
        }

        .checkbox-label {
          font-size: 14px;
          color: #333;
          font-weight: 500;
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
