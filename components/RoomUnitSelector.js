"use client";
import { useState, useEffect } from 'react';
import styles from './RoomUnitSelector.module.css';

/**
 * Room Unit Selector Component
 * 
 * Allows guests to select specific room units when booking
 * Shows only available units for the selected date range
 * 
 * Props:
 * - roomId: The room ID
 * - roomName: Display name of the room (e.g., "Loft Room")
 * - roomType: Room type enum (e.g., "LOFT", "TEPEE")
 * - checkIn: Check-in date string (YYYY-MM-DD)
 * - checkOut: Check-out date string (YYYY-MM-DD)
 * - selectedUnit: Currently selected unit number
 * - onUnitSelect: Callback when unit is selected (unitNumber) => void
 * - disabled: Whether the selector is disabled
 */
export default function RoomUnitSelector({
  roomId,
  roomName,
  roomType,
  checkIn,
  checkOut,
  selectedUnit,
  onUnitSelect,
  disabled = false
}) {
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available units when dates or room change
  useEffect(() => {
    if (!roomId || !checkIn || !checkOut) {
      setAvailableUnits([]);
      return;
    }

    async function fetchAvailableUnits() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/rooms/${roomId}/units/availability?checkIn=${checkIn}&checkOut=${checkOut}`
        );

        if (!response.ok) {
          // Try to get error details from response
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.details || '';
          } catch {
            errorDetails = `Status: ${response.status}`;
          }
          console.warn(`[RoomUnitSelector] API error (${response.status}):`, errorDetails);
          // Gracefully handle by showing no units instead of crashing
          setAvailableUnits([]);
          return; // Don't throw, just silently fail
        }

        const data = await response.json();
        setAvailableUnits(data.availableUnits || []);

        // If previously selected unit is no longer available, clear selection
        if (selectedUnit && !data.availableUnits.some(u => u.unitNumber === selectedUnit)) {
          onUnitSelect(null);
        }

      } catch (err) {
        console.error('Error fetching available units:', err);
        // Don't show error to user, just show empty units
        setAvailableUnits([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailableUnits();
  }, [roomId, checkIn, checkOut]);

  // Get room type display text
  const getRoomTypeLabel = (type) => {
    const labels = {
      LOFT: 'Loft',
      TEPEE: 'Tepee',
      VILLA: 'Villa',
      FAMILY_LODGE: 'Family Lodge'
    };
    return labels[type] || type;
  };

  // Get icon for feature
  const getFeatureIcon = (feature) => {
    const icons = {
      balcony: '🏔️',
      renovated: '✨',
      corner_unit: '📐',
      accessible: '♿',
      ocean_view: '🌊',
      garden_view: '🌳',
      pool_view: '🏊',
      quiet: '🤫',
      ground_floor: '⬇️',
      second_floor: '⬆️'
    };
    return icons[feature] || '•';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h4 className={styles.title}>Select Your {getRoomTypeLabel(roomType)} Unit</h4>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading available units...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h4 className={styles.title}>Select Your {getRoomTypeLabel(roomType)} Unit</h4>
        </div>
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (availableUnits.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h4 className={styles.title}>Select Your {getRoomTypeLabel(roomType)} Unit</h4>
        </div>
        <div className={styles.noUnits}>
          <p>⚠️ No units available for the selected dates.</p>
          <p className={styles.hint}>Please try different dates or choose another room type.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Select Your {getRoomTypeLabel(roomType)} Unit</h4>
        <p className={styles.subtitle}>
          {availableUnits.length} unit{availableUnits.length !== 1 ? 's' : ''} available for your dates
        </p>
      </div>

      <div className={styles.unitsGrid}>
        {availableUnits.map((unit) => {
          const isSelected = selectedUnit === unit.unitNumber;
          
          return (
            <button
              key={unit.unitNumber}
              type="button"
              className={`${styles.unitCard} ${isSelected ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
              onClick={() => !disabled && onUnitSelect(unit.unitNumber)}
              disabled={disabled}
            >
              <div className={styles.unitNumber}>
                {getRoomTypeLabel(roomType)} #{unit.unitNumber}
              </div>

              {unit.description && (
                <div className={styles.description}>
                  📍 {unit.description}
                </div>
              )}

              {unit.location && (
                <div className={styles.location}>
                  {unit.location}
                </div>
              )}

              {unit.features && Array.isArray(unit.features) && unit.features.length > 0 && (
                <div className={styles.features}>
                  {unit.features.map((feature, idx) => (
                    <span key={idx} className={styles.feature}>
                      {getFeatureIcon(feature)} {feature.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {isSelected && (
                <div className={styles.selectedBadge}>
                  ✓ Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedUnit && (
        <div className={styles.selectedInfo}>
          ✓ You've selected <strong>{getRoomTypeLabel(roomType)} #{selectedUnit}</strong>
        </div>
      )}
    </div>
  );
}
