'use client';
import { useState, useEffect } from 'react';
import DefaultAmenitiesDisplay from './DefaultAmenitiesDisplay';
import OptionalAmenitiesSelector from './OptionalAmenitiesSelector';
import RentalAmenitiesSelector from './RentalAmenitiesSelector';

export default function RoomAmenitiesSelector({
  roomType,
  selectedAmenities,
  onAmenitiesChange,
}) {

  // This component now only orchestrates the other selectors
  // and passes data up to the parent booking page.

  const handleOptionalChange = (newOptional) => {
    onAmenitiesChange(prev => ({ ...prev, optional: newOptional }));
  };

  const handleRentalChange = (newRental) => {
    onAmenitiesChange(prev => ({ ...prev, rental: newRental }));
  };

  // A simple way to check if the roomType is valid before rendering children
  if (!roomType) {
    return (
        <div className="awaiting-selection">
            <p>Please select a room to see available amenities.</p>
            <style jsx>{`
                .awaiting-selection {
                    text-align: center;
                    padding: 40px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    color: #6c757d;
                }
            `}</style>
        </div>
    );
  }

  return (
    <div className="room-amenities-selector">
      <DefaultAmenitiesDisplay roomType={roomType} />
      <OptionalAmenitiesSelector 
        selectedAmenities={selectedAmenities.optional}
        onAmenitiesChange={handleOptionalChange}
      />
      <RentalAmenitiesSelector 
        selectedAmenities={selectedAmenities.rental}
        onAmenitiesChange={handleRentalChange}
      />
      {/* You can add a cottage selector here if needed */}

      <style jsx>{`
        .room-amenities-selector {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
      `}</style>
    </div>
  );
}
