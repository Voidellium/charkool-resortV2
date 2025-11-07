'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function UnitManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [unitStatuses, setUnitStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [bookings, setBookings] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableBookings, setAvailableBookings] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'RECEPTIONIST') {
      router.push('/login');
      return;
    }
    
    fetchRooms();
  }, [status, session]);

  useEffect(() => {
    if (selectedRoom) {
      fetchUnitStatuses();
      fetchBookings();
    }
  }, [selectedRoom, dateRange]);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        if (data.length > 0) {
          setSelectedRoom(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitStatuses = async () => {
    if (!selectedRoom) return;
    
    try {
      const res = await fetch(
        `/api/rooms/${selectedRoom.id}/units/availability?checkIn=${dateRange.startDate}&checkOut=${dateRange.endDate}`
      );
      
      if (res.ok) {
        const data = await res.json();
        const statuses = {};
        
        // Mark available units
        data.availableUnits.forEach(unit => {
          statuses[unit] = { status: 'Available', metadata: data.metadata?.[unit] };
        });
        
        // Mark booked units (all units not in availableUnits)
        for (let i = 1; i <= selectedRoom.quantity; i++) {
          if (!data.availableUnits.includes(i)) {
            statuses[i] = { status: 'Booked', metadata: data.metadata?.[i] };
          }
        }
        
        setUnitStatuses(statuses);
      }
    } catch (error) {
      console.error('Failed to fetch unit statuses:', error);
    }
  };

  const fetchBookings = async () => {
    if (!selectedRoom) return;
    
    try {
      const res = await fetch('/api/receptionist/bookings');
      if (res.ok) {
        const data = await res.json();
        // Filter bookings for this room within date range
        const filtered = data.filter(booking => {
          const hasRoom = booking.rooms?.some(r => r.roomId === selectedRoom.id);
          const inDateRange = 
            new Date(booking.checkIn) <= new Date(dateRange.endDate) &&
            new Date(booking.checkOut) >= new Date(dateRange.startDate);
          return hasRoom && inDateRange && booking.status !== 'Cancelled';
        });
        setBookings(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleAssignUnit = async (bookingId, unitNumber) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          unitNumber: parseInt(unitNumber)
        })
      });
      
      if (res.ok) {
        alert('Unit assigned successfully!');
        setShowAssignModal(false);
        setSelectedUnit(null);
        fetchUnitStatuses();
        fetchBookings();
      } else {
        const error = await res.json();
        alert(`Failed to assign unit: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to assign unit:', error);
      alert('Failed to assign unit');
    }
  };

  const handleReassignUnit = async (bookingId, oldUnit, newUnit) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/units`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          oldUnitNumber: parseInt(oldUnit),
          newUnitNumber: parseInt(newUnit)
        })
      });
      
      if (res.ok) {
        alert('Unit reassigned successfully!');
        fetchUnitStatuses();
        fetchBookings();
      } else {
        const error = await res.json();
        alert(`Failed to reassign unit: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to reassign unit:', error);
      alert('Failed to reassign unit');
    }
  };

  const openAssignModal = (unitNumber) => {
    setSelectedUnit(unitNumber);
    
    // Find bookings for this room that don't have this unit assigned yet
    const available = bookings.filter(booking => {
      const hasRoomBooking = booking.rooms?.some(r => r.roomId === selectedRoom.id);
      // Check if this unit is not already assigned to this booking
      const unitAssignment = booking.unitAssignments?.find(
        u => u.roomId === selectedRoom.id && u.unitNumber === unitNumber
      );
      return hasRoomBooking && !unitAssignment;
    });
    
    setAvailableBookings(available);
    setShowAssignModal(true);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div className="unit-management-container">
      <header className="page-header">
        <h1>Room Unit Management</h1>
        <p>Assign and manage specific room units for bookings</p>
      </header>

      <div className="controls-section">
        <div className="control-group">
          <label>Select Room</label>
          <select
            value={selectedRoom?.id || ''}
            onChange={(e) => {
              const room = rooms.find(r => r.id === e.target.value);
              setSelectedRoom(room);
            }}
            className="room-select"
          >
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.type}) - {room.quantity} units
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Date Range</label>
          <div className="date-range-inputs">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="date-input"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="date-input"
            />
          </div>
        </div>
      </div>

      {selectedRoom && (
        <>
          <div className="units-grid">
            {Array.from({ length: selectedRoom.quantity }, (_, i) => i + 1).map(unitNum => {
              const status = unitStatuses[unitNum] || { status: 'Loading...', metadata: null };
              const booking = bookings.find(b => 
                b.unitAssignments?.some(u => u.roomId === selectedRoom.id && u.unitNumber === unitNum)
              );
              
              return (
                <div
                  key={unitNum}
                  className={`unit-card ${status.status.toLowerCase()}`}
                  onClick={() => status.status === 'Available' && openAssignModal(unitNum)}
                >
                  <div className="unit-header">
                    <h3>{selectedRoom.name} #{unitNum}</h3>
                    <span className={`status-badge ${status.status.toLowerCase()}`}>
                      {status.status}
                    </span>
                  </div>
                  
                  {status.metadata && (
                    <div className="unit-metadata">
                      {status.metadata.description && (
                        <p className="metadata-item">📝 {status.metadata.description}</p>
                      )}
                      {status.metadata.location && (
                        <p className="metadata-item">📍 {status.metadata.location}</p>
                      )}
                      {status.metadata.features && (
                        <div className="features-list">
                          {status.metadata.features.map((feature, idx) => (
                            <span key={idx} className="feature-tag">{feature}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {booking && (
                    <div className="booking-info">
                      <p><strong>Guest:</strong> {booking.guestName || booking.user?.name}</p>
                      <p><strong>Check-in:</strong> {new Date(booking.checkIn).toLocaleDateString()}</p>
                      <p><strong>Check-out:</strong> {new Date(booking.checkOut).toLocaleDateString()}</p>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newUnit = prompt(`Reassign to unit number (1-${selectedRoom.quantity}):`);
                          if (newUnit && parseInt(newUnit) !== unitNum) {
                            handleReassignUnit(booking.id, unitNum, newUnit);
                          }
                        }}
                      >
                        Reassign
                      </button>
                    </div>
                  )}
                  
                  {status.status === 'Available' && (
                    <button className="btn-assign">
                      Click to Assign
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bookings-section">
            <h2>Bookings for {selectedRoom.name}</h2>
            <div className="bookings-list">
              {bookings.map(booking => {
                const assignedUnits = booking.unitAssignments?.filter(
                  u => u.roomId === selectedRoom.id
                ) || [];
                
                return (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-header">
                      <h4>Booking #{booking.id.slice(0, 8)}</h4>
                      <span className="booking-status">{booking.status}</span>
                    </div>
                    <p><strong>Guest:</strong> {booking.guestName || booking.user?.name}</p>
                    <p><strong>Dates:</strong> {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}</p>
                    <p>
                      <strong>Assigned Units:</strong>{' '}
                      {assignedUnits.length > 0
                        ? assignedUnits.map(u => `#${u.unitNumber}`).join(', ')
                        : <span style={{ color: '#dc3545' }}>Not assigned</span>
                      }
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Unit #{selectedUnit}</h3>
            <p>Select a booking to assign this unit:</p>
            
            {availableBookings.length > 0 ? (
              <div className="booking-list">
                {availableBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="booking-option"
                    onClick={() => handleAssignUnit(booking.id, selectedUnit)}
                  >
                    <p><strong>{booking.guestName || booking.user?.name}</strong></p>
                    <p className="booking-dates">
                      {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-bookings">No available bookings for this unit</p>
            )}
            
            <button className="btn-cancel" onClick={() => setShowAssignModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .unit-management-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          background: linear-gradient(135deg, #FFF8DC 0%, #F5F5DC 50%, #F0F8E8 100%);
          min-height: 100vh;
        }

        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #8B4513, #D4AF37, #FEBE52);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem 0;
        }

        .page-header p {
          font-size: 1.1rem;
          color: #A0826D;
        }

        .controls-section {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .control-group label {
          display: block;
          font-weight: 600;
          color: #8B4513;
          margin-bottom: 0.5rem;
        }

        .room-select, .date-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #E5D5A3;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
        }

        .date-range-inputs {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .date-range-inputs span {
          color: #A0826D;
          font-weight: 500;
        }

        .units-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .unit-card {
          background: white;
          border: 2px solid #E5D5A3;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .unit-card.available {
          border-color: #28a745;
          background: linear-gradient(135deg, #ffffff 0%, #f0fff4 100%);
        }

        .unit-card.available:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(40, 167, 69, 0.25);
        }

        .unit-card.booked {
          border-color: #dc3545;
          background: linear-gradient(135deg, #ffffff 0%, #fff5f5 100%);
          cursor: default;
        }

        .unit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .unit-header h3 {
          margin: 0;
          font-size: 1.3rem;
          color: #8B4513;
        }

        .status-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          color: white;
        }

        .status-badge.available {
          background: #28a745;
        }

        .status-badge.booked {
          background: #dc3545;
        }

        .unit-metadata {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .metadata-item {
          margin: 0.25rem 0;
          font-size: 0.95rem;
          color: #495057;
        }

        .features-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .feature-tag {
          padding: 0.25rem 0.6rem;
          background: #FEBE52;
          color: white;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .booking-info {
          margin-top: 1rem;
          padding: 1rem;
          background: #fff3cd;
          border-radius: 8px;
          border: 1px solid #ffc107;
        }

        .booking-info p {
          margin: 0.5rem 0;
          font-size: 0.95rem;
        }

        .btn-assign {
          width: 100%;
          padding: 0.75rem;
          margin-top: 1rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .btn-assign:hover {
          background: #218838;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        .btn-sm {
          font-size: 0.85rem;
          padding: 0.4rem 0.8rem;
        }

        .bookings-section {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .bookings-section h2 {
          margin: 0 0 1.5rem 0;
          color: #8B4513;
        }

        .bookings-list {
          display: grid;
          gap: 1rem;
        }

        .booking-card {
          padding: 1rem;
          border: 1px solid #E5D5A3;
          border-radius: 8px;
          background: #fafafa;
        }

        .booking-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .booking-header h4 {
          margin: 0;
          color: #8B4513;
        }

        .booking-status {
          padding: 0.3rem 0.7rem;
          border-radius: 15px;
          background: #0d6efd;
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .booking-card p {
          margin: 0.5rem 0;
          font-size: 0.95rem;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-content h3 {
          margin: 0 0 1rem 0;
          color: #8B4513;
        }

        .booking-list {
          display: grid;
          gap: 0.75rem;
          margin: 1.5rem 0;
        }

        .booking-option {
          padding: 1rem;
          border: 2px solid #E5D5A3;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .booking-option:hover {
          border-color: #FEBE52;
          background: #FFF8DC;
          transform: translateX(4px);
        }

        .booking-option p {
          margin: 0.25rem 0;
        }

        .booking-dates {
          font-size: 0.9rem;
          color: #6c757d;
        }

        .no-bookings {
          text-align: center;
          color: #6c757d;
          padding: 2rem;
        }

        .btn-cancel {
          width: 100%;
          padding: 0.75rem;
          margin-top: 1rem;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-cancel:hover {
          background: #5a6268;
        }

        @media (max-width: 768px) {
          .controls-section {
            grid-template-columns: 1fr;
          }

          .units-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
