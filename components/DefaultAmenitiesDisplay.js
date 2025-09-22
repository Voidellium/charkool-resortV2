'use client';
import { useState, useEffect } from 'react';

export default function DefaultAmenitiesDisplay({ roomType }) {
  const [defaultAmenities, setDefaultAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDefaultAmenities = async () => {
      if (!roomType) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/room-types/${roomType}/amenities`);

        if (response.ok) {
          const data = await response.json();
          setDefaultAmenities(data);
        } else {
          setError('Failed to load default amenities');
        }
      } catch (err) {
        console.error('Error loading default amenities:', err);
        setError('Failed to load default amenities');
      } finally {
        setLoading(false);
      }
    };

    loadDefaultAmenities();
  }, [roomType]);

  if (loading) {
    return (
      <div className="default-amenities-loading">
        <p>Loading included amenities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="default-amenities-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (defaultAmenities.length === 0) {
    return (
      <div className="default-amenities-empty">
        <p>No default amenities configured for this room type.</p>
      </div>
    );
  }

  return (
    <div className="default-amenities-display">
      <h4>Included Amenities</h4>
      <div className="amenities-list">
        {defaultAmenities.map((amenity) => (
          <div key={amenity.id} className="amenity-item">
            <div className="amenity-icon">✓</div>
            <div className="amenity-details">
              <span className="amenity-name">{amenity.amenityName}</span>
              {amenity.description && (
                <span className="amenity-description">{amenity.description}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .default-amenities-display {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }

        .default-amenities-display h4 {
          color: #28a745;
          margin: 0 0 15px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .amenities-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .amenity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .amenity-icon {
          width: 24px;
          height: 24px;
          background: #28a745;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .amenity-details {
          flex: 1;
        }

        .amenity-name {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }

        .amenity-description {
          display: block;
          font-size: 14px;
          color: #666;
        }

        .default-amenities-loading,
        .default-amenities-error,
        .default-amenities-empty {
          padding: 20px;
          text-align: center;
          color: #666;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }

        .default-amenities-error {
          border-left-color: #dc3545;
          color: #dc3545;
        }
      `}</style>
    </div>
  );
}
