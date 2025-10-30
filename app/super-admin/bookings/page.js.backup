"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, Search, Filter, Calendar, Users, DollarSign, 
  TrendingUp, Eye, Edit, Trash2, CheckCircle, XCircle, 
  Clock, MapPin, Phone, Mail, Star, MoreHorizontal,
  Download, RefreshCw, Settings, ArrowUpDown, ChevronDown, Circle
} from 'lucide-react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import Loading, { TableLoading, ButtonLoading } from '@/components/Loading';
import RoomAmenitiesSelector from '@/components/RoomAmenitiesSelector';
import RentalAmenitiesSelector from '@/components/RentalAmenitiesSelector';
import OptionalAmenitiesSelector from '@/components/OptionalAmenitiesSelector';
import BookingCalendar from '@/components/BookingCalendar';
import { useToast } from '@/components/Toast';
import { useOverrideModal, OverrideModal } from '@/components/CustomModals';

// Timezone-safe date formatting utility
function formatDate(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BookingsPage() {
  // Add modal animation styles on component mount
  useEffect(() => {
    const styleId = 'modal-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .modal-responsive {
          animation: modalSlideIn 0.3s ease-out;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Get session for audit trail
  const { data: session } = useSession();

  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentOption, setFilterPaymentOption] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const BOOKINGS_PER_PAGE = 8;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [currentBooking, setCurrentBooking] = useState(null);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBookingDetails, setHistoryBookingDetails] = useState(null);
  const [currentTab, setCurrentTab] = useState('active');
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);

  // Override modal for early check-in/out (shared)
  const [overrideModal, setOverrideModal] = useOverrideModal();
  
  // Toast notifications
  const { success, error, warning, info } = useToast();

  // New state for booking creation form
  const [createBookingStep, setCreateBookingStep] = useState(1);
  const [createBookingForm, setCreateBookingForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    paymentMode: 'cash', // Default to cash
    selectedRooms: {}, // { roomId: quantity }
    selectedRoomDetails: {}, // { roomId: { name, type, price, image } }
    selectedAmenities: { optional: {}, rental: {}, cottage: null },
  });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [dateWarning, setDateWarning] = useState('');
  const [roomLockWarning, setRoomLockWarning] = useState('');
  const [rentalAmenitiesData, setRentalAmenitiesData] = useState([]);
  const [optionalAmenitiesData, setOptionalAmenitiesData] = useState([]);
  const [createTotalPrice, setCreateTotalPrice] = useState(0);
  const [availabilityData, setAvailabilityData] = useState({});

  // Modal state to prevent spam clicks
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // New state for animated dots in modal
  const [dotCount, setDotCount] = useState(1);

  // Submit ref to prevent multiple submissions
  const submittingRef = useRef(false);

  // Modern UI state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch initial availability data
  useEffect(() => {
    async function fetchAvailability() {
      try {
        const today = new Date();
        const startOfMonth = new Date(today);
        const endOf3Months = new Date(today.getFullYear(), today.getMonth() + 4, 0);
        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkIn: formatDate(startOfMonth),
            checkOut: formatDate(endOf3Months),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAvailabilityData(data.availability || {});
        }
      } catch (err) { console.error('Failed to load availability:', err); }
    }
    fetchAvailability();

    // Fetch rental amenities data for price breakdown
    async function fetchRentalAmenities() {
      try {
        const res = await fetch('/api/amenities/rental');
        if (res.ok) {
          const data = await res.json();
          setRentalAmenitiesData(data);
        }
      } catch (err) {
        console.error('Failed to load rental amenities:', err);
      }
    }
    fetchRentalAmenities();

    // Fetch optional amenities data for price breakdown
    async function fetchOptionalAmenities() {
      try {
        const res = await fetch('/api/amenities/optional');
        if (res.ok) {
          const data = await res.json();
          setOptionalAmenitiesData(data);
        }
      } catch (err) {
        console.error('Failed to load optional amenities:', err);
      }
    }
    fetchOptionalAmenities();
  }, []);

  // Live total calculation for create modal
  useEffect(() => {
    async function calculateCreateTotal() {
      if (!createBookingForm.checkIn || !createBookingForm.checkOut || Object.keys(createBookingForm.selectedRooms).length === 0) {
        setCreateTotalPrice(0);
        return;
      }
      const nights = Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24));

      // Prepare rental amenities in expected format
      const rentalAmenitiesFormatted = {};
      for (const [id, selection] of Object.entries(createBookingForm.selectedAmenities.rental || {})) {
        rentalAmenitiesFormatted[id] = {
          quantity: selection.quantity || 0,
          hoursUsed: selection.hoursUsed || 0
        };
      }

      try {
        const res = await fetch('/api/bookings/calculate-total', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedRooms: createBookingForm.selectedRooms,
            nights,
            optionalAmenities: createBookingForm.selectedAmenities.optional || {},
            rentalAmenities: rentalAmenitiesFormatted,
            cottage: createBookingForm.selectedAmenities.cottage
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCreateTotalPrice(data.totalPrice || 0);
        }
      } catch (error) {
        console.error("Create price calculation error:", error);
        setCreateTotalPrice(0);
      }
    }

    calculateCreateTotal();
  }, [createBookingForm.selectedRooms, createBookingForm.selectedAmenities, createBookingForm.checkIn, createBookingForm.checkOut]);

  // Date validation
  useEffect(() => {
    if (!createBookingForm.checkIn) {
      setDateWarning('Please select a check-in date.');
    } else if (!createBookingForm.checkOut) {
      setDateWarning('Please select a check-out date. Single date selection is not allowed.');
    } else if (createBookingForm.checkIn === createBookingForm.checkOut) {
      setDateWarning('Check-out must be different from check-in.');
    } else {
      setDateWarning('');
    }
  }, [createBookingForm.checkIn, createBookingForm.checkOut]);

  // Animate dots in modal
  useEffect(() => {
    if (!showSubmitModal) {
      setDotCount(1);
      return;
    }
    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);
    return () => clearInterval(interval);
  }, [showSubmitModal]);

  // Fetch available rooms when dates change
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (!createBookingForm.checkIn || !createBookingForm.checkOut || createBookingForm.checkIn === createBookingForm.checkOut) {
        setAvailableRooms([]);
        return;
      }
      setLoadingRooms(true);
      try {
        const res = await fetch(`/api/rooms?checkIn=${createBookingForm.checkIn}&checkOut=${createBookingForm.checkOut}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableRooms(data.filter(room => room.remaining > 0));
        } else {
          setAvailableRooms([]);
        }
      } catch (error) {
        console.error('Failed to fetch available rooms:', error);
        setAvailableRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchAvailableRooms();
  }, [createBookingForm.checkIn, createBookingForm.checkOut]);

  // Price calculation
  useEffect(() => {
    const nights = createBookingForm.checkIn && createBookingForm.checkOut 
      ? Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24)) 
      : 1;

    async function calculateTotal() {
      try {
        // Prepare rental amenities in expected format
        const rentalAmenitiesFormatted = {};
        for (const [id, selection] of Object.entries(createBookingForm.selectedAmenities.rental)) {
          rentalAmenitiesFormatted[id] = {
            quantity: selection.quantity || 0,
            hoursUsed: selection.hoursUsed || 0
          };
        }

        const res = await fetch('/api/bookings/calculate-total', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedRooms: createBookingForm.selectedRooms,
            nights,
            optionalAmenities: createBookingForm.selectedAmenities.optional,
            rentalAmenities: rentalAmenitiesFormatted,
            cottage: createBookingForm.selectedAmenities.cottage
          }),
        });
        if(res.ok) {
          const data = await res.json();
          setTotalPrice(data.totalPrice || 0);
        }
      } catch (error) {
        console.error("Price calculation error:", error);
      }
    }

    calculateTotal();
  }, [createBookingForm.selectedRooms, createBookingForm.selectedAmenities, createBookingForm.checkIn, createBookingForm.checkOut]);

  const getRoomCapacity = (roomType) => {
    switch (roomType) {
      case 'TEPEE':
        return { min: 1, max: 5 };
      case 'LOFT':
        return { min: 1, max: 3 };
      case 'VILLA':
        return { min: 1, max: 10 };
      default:
        return { min: 1, max: 100 };
    }
  };

  // compute total capacity from selectedRooms
  const computeTotalCapacity = () => {
    return Object.entries(createBookingForm.selectedRooms).reduce((sum, [roomId, qty]) => {
      const r = availableRooms.find(room => room.id == roomId);
      if (r) {
        const cap = getRoomCapacity(r.type);
        return sum + (cap.max * qty);
      }
      return sum;
    }, 0);
  };

  // is room lock active (other rooms locked when true)
  const isRoomLockActive = () => {
    const totalCap = computeTotalCapacity();
    return totalCap >= createBookingForm.numberOfGuests && Object.keys(createBookingForm.selectedRooms).length > 0;
  };

  // date selection validity: we treat single-date selection (checkOut empty OR checkOut === checkIn) as invalid
  const isDateSelectionValid = () => {
    if (!createBookingForm.checkIn) return false;
    if (!createBookingForm.checkOut) return false;
    if (createBookingForm.checkIn === createBookingForm.checkOut) return false;
    return true;
  };

  // Update room lock warning when selection changes
  useEffect(() => {
    if (isRoomLockActive()) {
      const totalCap = computeTotalCapacity();
      setRoomLockWarning(`Selected rooms now accommodate ${totalCap} guest(s). Other room options are locked to prevent over-selection.`);
    } else {
      setRoomLockWarning('');
    }
  }, [createBookingForm.selectedRooms, createBookingForm.numberOfGuests, availableRooms]);

  const handleRoomSelect = (room) => {
    const locked = isRoomLockActive();
    const alreadySelected = !!createBookingForm.selectedRooms[room.id];
    if (locked && !alreadySelected) return;
    setCreateBookingForm(prev => {
      const selectedRooms = { ...prev.selectedRooms };
      if (selectedRooms[room.id]) {
        delete selectedRooms[room.id];
      } else {
        selectedRooms[room.id] = 1;
      }
      return { ...prev, selectedRooms };
    });
  };

  const handleRoomQuantityChange = (roomId, delta) => {
    const locked = isRoomLockActive();
    const isSelected = !!createBookingForm.selectedRooms[roomId];
    if (locked && !isSelected) return;
    setCreateBookingForm(prev => {
      const selectedRooms = { ...prev.selectedRooms };
      const currentQty = selectedRooms[roomId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      const room = availableRooms.find(r => r.id == roomId);
      if (room && newQty > room.remaining) {
        return prev;
      }
      if (newQty === 0) {
        delete selectedRooms[roomId];
      } else {
        selectedRooms[roomId] = newQty;
      }
      return { ...prev, selectedRooms };
    });
  };

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings?includeDeleted=true', { headers: { 'Content-Type': 'application/json' } });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API Error:', errorData);
        setMessage({ type: 'error', text: errorData.error || 'Failed to load bookings' });
        setBookings([]);
        setHistoryBookings([]);
        return;
      }
      
      const data = await res.json();
      
      // Handle paginated response structure
      const bookingsData = data.bookings || data; // Support both old and new API structure
      
      if (Array.isArray(bookingsData)) {
        setBookings(bookingsData.filter(b => b && !b.isDeleted));
        setHistoryBookings(bookingsData.filter(b => b && b.isDeleted));
      } else {
        console.error('Invalid bookings data format:', data);
        setMessage({ type: 'error', text: 'Invalid bookings data format received. Please check console for details.' });
        setBookings([]);
        setHistoryBookings([]);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setMessage({ type: 'error', text: 'Failed to load bookings: ' + err.message });
      setBookings([]);
      setHistoryBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // Handle booking edit
  const handleEdit = (booking) => {
    setCurrentBooking(booking);
    setShowEditModal(true);
  };

  // Handle more actions
  const handleMoreActions = (booking) => {
    setCurrentBooking(booking);
    setShowMoreActionsModal(true);
  };

  // Handle bulk actions
  const handleBulkAction = (action) => {
    if (selectedBookings.length === 0) {
      alert('Please select bookings first');
      return;
    }
    setShowBulkActionsModal(true);
  };

  // Toggle booking selection
  const toggleBookingSelection = (bookingId) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  // Select all bookings
  const toggleSelectAll = () => {
    setSelectedBookings(prev => 
      prev.length === paginatedBookings.length 
        ? [] 
        : paginatedBookings.filter(booking => booking && booking.id).map(booking => booking.id)
    );
  };

  // Export bookings
  const exportBookings = () => {
    const csvData = filteredBookings.filter(booking => booking).map(booking => ({
      'Booking ID': booking.id || 'N/A',
      'Guest Name': booking.guestName || 'N/A',
      'Check-in': booking.checkInDate || 'N/A',
      'Check-out': booking.checkOutDate || 'N/A',
      'Room': booking.roomNumber || 'N/A',
      'Status': booking.status || 'N/A',
      'Total': `₱${booking.totalAmount || 0}`,
      'Payment': booking.paymentOption || 'N/A'
    }));
    
    if (csvData.length === 0) {
      alert('No bookings to export');
      return;
    }
    
    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings-export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to move this booking to history?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeleted: true }),
      });
      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.filter(b => b.id !== id));
        setHistoryBookings([...historyBookings, updatedBooking]);
        setMessage({ type: 'success', text: 'Booking moved to history successfully.' });
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to move booking to history' });
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings based on search and filters
  const filteredBookings = bookings.filter((booking) => {
    // Add null check for booking object
    if (!booking) return false;
    
    const matchesStatus = !filterStatus || booking.status === filterStatus;
    const matchesPaymentOption = !filterPaymentOption || booking.paymentOption === filterPaymentOption;
    const matchesPaymentMethod = !filterPaymentMethod || (booking.paymentMethods && booking.paymentMethods.includes(filterPaymentMethod));
    const matchesSearch = !searchTerm || 
                         (booking.guestName && booking.guestName.toLowerCase().includes(searchTerm.toLowerCase())) || 
                         (booking.id && booking.id.toString().includes(searchTerm));
    return matchesStatus && matchesPaymentOption && matchesPaymentMethod && matchesSearch;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE);
  const startIndex = (currentPage - 1) * BOOKINGS_PER_PAGE;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + BOOKINGS_PER_PAGE);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterPaymentOption, filterPaymentMethod, searchTerm]);

  // Handle status change
  const handleStatusChange = async (id, newStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => b.id === id ? updatedBooking : b));
        setMessage({ type: 'success', text: `Booking ${newStatus.toLowerCase()} successfully.` });
      } else {
        throw new Error('Status change failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update booking status' });
    } finally {
      setLoading(false);
    }
  };

  // Handle cancellation with remarks
  const handleCancelWithRemarks = async (id, remarks) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Cancelled', 
          cancellationRemarks: remarks || 'No remarks provided' 
        }),
      });
      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => b.id === id ? updatedBooking : b));
        
        // Record audit trail for cancellation
        try {
          await fetch('/api/audit-trails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actorId: session?.user?.id,
              actorName: session?.user?.name || session?.user?.email,
              actorRole: session?.user?.role || 'SUPERADMIN',
              action: 'CANCEL',
              entity: 'Booking',
              entityId: String(id),
              details: JSON.stringify({
                summary: `Cancelled booking #${id}`,
                cancellationRemarks: remarks || 'No remarks provided',
                before: bookings.find(b => b.id === id),
                after: updatedBooking
              }),
            }),
          });
        } catch (auditErr) {
          console.error('Failed to record audit trail:', auditErr);
          // Don't fail the cancellation if audit logging fails
        }
        
        setMessage({ type: 'success', text: 'Booking cancelled successfully.' });
        success('Booking cancelled successfully');
        
        // Auto-close the cancel modal
        setShowCancelModal(false);
        setCancelRemarks('');
        setCurrentBooking(null);
      } else {
        throw new Error('Cancellation failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to cancel booking' });
      error('Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div style={styles.container}>
        {/* Modern Header Section */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>Bookings Management</h1>
              <p style={styles.subtitle}>Manage reservations, track occupancy, and optimize your business</p>
            </div>
            <div style={styles.headerActions}>
              <button
                onClick={() => setShowCreateBookingModal(true)}
                style={styles.primaryButton}
              >
                <Plus size={20} />
                New Booking
              </button>
              <button style={styles.secondaryButton}>
                <Download size={20} />
                Export
              </button>
              <button style={styles.iconButton}>
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards Section */}
        <div style={styles.kpiSection}>
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiContent}>
                <div style={styles.kpiIcon}>
                  <Calendar size={24} />
                </div>
                <div style={styles.kpiInfo}>
                  <h3 style={styles.kpiValue}>{bookings.length}</h3>
                  <p style={styles.kpiLabel}>Total Bookings</p>
                </div>
              </div>
              <div style={styles.kpiTrend}>
                <TrendingUp size={16} style={{ color: '#10b981' }} />
                <span style={{ color: '#10b981', fontSize: '0.875rem' }}>+12%</span>
              </div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiContent}>
                <div style={{ ...styles.kpiIcon, backgroundColor: '#fef3c7' }}>
                  <Users size={24} style={{ color: '#f59e0b' }} />
                </div>
                <div style={styles.kpiInfo}>
                  <h3 style={styles.kpiValue}>{bookings.filter(b => b.status === 'confirmed').length}</h3>
                  <p style={styles.kpiLabel}>Active Bookings</p>
                </div>
              </div>
              <div style={styles.kpiTrend}>
                <TrendingUp size={16} style={{ color: '#10b981' }} />
                <span style={{ color: '#10b981', fontSize: '0.875rem' }}>+8%</span>
              </div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiContent}>
                <div style={{ ...styles.kpiIcon, backgroundColor: '#ddd6fe' }}>
                  <DollarSign size={24} style={{ color: '#8b5cf6' }} />
                </div>
                <div style={styles.kpiInfo}>
                  <h3 style={styles.kpiValue}>₱{(bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)).toLocaleString()}</h3>
                  <p style={styles.kpiLabel}>Total Revenue</p>
                </div>
              </div>
              <div style={styles.kpiTrend}>
                <TrendingUp size={16} style={{ color: '#10b981' }} />
                <span style={{ color: '#10b981', fontSize: '0.875rem' }}>+15%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters Section */}
        <div style={styles.filtersCard}>
          <div style={styles.filtersHeader}>
            <div style={styles.searchContainer}>
              <Search size={20} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by guest name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            
            <div style={styles.quickFilters}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.quickFilterSelect}
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
              
              <select
                value={filterPaymentOption}
                onChange={(e) => setFilterPaymentOption(e.target.value)}
                style={styles.quickFilterSelect}
              >
                <option value="">All Payment Options</option>
                <option value="full">Full Payment</option>
                <option value="partial">Partial Payment</option>
                <option value="deposit">Deposit Only</option>
              </select>
              
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                style={styles.quickFilterSelect}
              >
                <option value="">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank Transfer</option>
                <option value="gcash">GCash</option>
              </select>
              
              <button
                onClick={() => {
                  setShowCreateBookingModal(true);
                }}
                style={styles.addBookingButton}
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div style={styles.filterActions}>
              {selectedBookings.length > 0 && (
                <div style={styles.bulkActionsContainer}>
                  <span style={styles.selectedCount}>
                    {selectedBookings.length} selected
                  </span>
                  <button
                    onClick={() => handleBulkAction('cancel')}
                    style={styles.bulkActionButton}
                  >
                    <Trash2 size={16} />
                    Cancel Selected
                  </button>
                  <button
                    onClick={() => setSelectedBookings([])}
                    style={styles.bulkActionButtonSecondary}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
              <button
                onClick={exportBookings}
                style={styles.exportButton}
              >
                <Download size={20} />
                Export
              </button>
              <div style={styles.viewToggle}>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    ...styles.viewToggleButton,
                    backgroundColor: viewMode === 'table' ? '#3b82f6' : '#f8fafc',
                    color: viewMode === 'table' ? '#ffffff' : '#64748b'
                  }}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  style={{
                    ...styles.viewToggleButton,
                    backgroundColor: viewMode === 'cards' ? '#3b82f6' : '#f8fafc',
                    color: viewMode === 'cards' ? '#ffffff' : '#64748b'
                  }}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Message Display */}
        {message && (
          <div style={styles.messageCard}>
            <div style={{
              ...styles.messageContent,
              backgroundColor: message.type === 'success' ? '#f0f9ff' : '#fef2f2',
              borderColor: message.type === 'success' ? '#0ea5e9' : '#ef4444',
            }}>
              <div style={styles.messageIcon}>
                {message.type === 'success' ? 
                  <CheckCircle size={20} style={{ color: '#0ea5e9' }} /> : 
                  <XCircle size={20} style={{ color: '#ef4444' }} />
                }
              </div>
              <div style={styles.messageText}>
                {message.text}
              </div>
              <button
                onClick={() => setMessage(null)}
                style={styles.messageClose}
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Modern Tab Navigation */}
        <div style={styles.tabsCard}>
          <div style={styles.tabsContainer}>
            <div style={styles.tabsList}>
              <button
                onClick={() => setCurrentTab('active')}
                style={{
                  ...styles.tabButton,
                  ...(currentTab === 'active' ? styles.tabButtonActive : {})
                }}
              >
                <Calendar size={18} />
                Active Bookings
                <span style={styles.tabBadge}>
                  {bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').length}
                </span>
              </button>
              <button
                onClick={() => setCurrentTab('history')}
                style={{
                  ...styles.tabButton,
                  ...(currentTab === 'history' ? styles.tabButtonActive : {})
                }}
              >
                <Clock size={18} />
                History
                <span style={styles.tabBadge}>
                  {historyBookings.length}
                </span>
              </button>
            </div>
            
            {/* Quick Stats in Tabs */}
            <div style={styles.tabsStats}>
              <div style={styles.quickStat}>
                <Users size={16} />
                <span>Today: {bookings.filter(b => {
                  const today = new Date().toDateString();
                  return new Date(b.checkIn).toDateString() === today;
                }).length}</span>
              </div>
              <div style={styles.quickStat}>
                <TrendingUp size={16} />
                <span>This Week: {bookings.filter(b => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(b.createdAt) >= weekAgo;
                }).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Create Booking Modal */}
        {showCreateBookingModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '10px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFF8E1',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(251, 190, 82, 0.5)',
                padding: '20px',
                color: '#5a3e00',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <h2 style={{ marginBottom: '20px', color: '#FEBE52' }}>Create Booking</h2>
              {/* Multi-step booking form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (submittingRef.current) return;

                  // Validation: Required name fields
                  if (!createBookingForm.firstName?.trim()) {
                    error('❌ First name is required.');
                    return;
                  }
                  
                  if (!createBookingForm.lastName?.trim()) {
                    error('❌ Last name is required.');
                    return;
                  }

                  // Validation: Number of guests
                  if (createBookingForm.numberOfGuests < 1) {
                    error('❌ Number of guests must be at least 1.');
                    return;
                  }

                  // Validation: date validity
                  if (!isDateSelectionValid()) {
                    error('❌ Please select both check-in and check-out dates (single date selection is not allowed).');
                    return;
                  }

                  // Validation: Check-in date not in the past
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const checkInDate = new Date(createBookingForm.checkIn);
                  if (checkInDate < today) {
                    error('❌ Check-in date cannot be in the past.');
                    return;
                  }

                  // Validation: Check-out after check-in
                  const checkOutDate = new Date(createBookingForm.checkOut);
                  if (checkOutDate <= checkInDate) {
                    error('❌ Check-out date must be after check-in date.');
                    return;
                  }

                  // Validation: selected rooms exist
                  if (Object.keys(createBookingForm.selectedRooms).length === 0) {
                    error('❌ Please select at least one room.');
                    return;
                  }

                  // Validation: capacity meets guests
                  const totalCapacity = computeTotalCapacity();
                  if (totalCapacity < createBookingForm.numberOfGuests) {
                    error(`❌ Selected rooms can accommodate ${totalCapacity} guest(s), but you have ${createBookingForm.numberOfGuests} guests. Add more rooms or decrease guest count.`);
                    return;
                  }

                  submittingRef.current = true;
                  setShowSubmitModal(true);
                  try {
                    const nights = Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24));

                    // Prepare rental amenities in expected format
                    const rental = {};
                    for (const [id, selection] of Object.entries(createBookingForm.selectedAmenities.rental || {})) {
                      rental[id] = {
                        quantity: selection.quantity || 0,
                        hoursUsed: selection.hoursUsed || 0
                      };
                    }

                    const optional = createBookingForm.selectedAmenities.optional || {};
                    const cottage = createBookingForm.selectedAmenities.cottage;

                    // Combine the name fields for submission
                    const guestName = `${createBookingForm.firstName}${createBookingForm.middleName ? ' ' + createBookingForm.middleName : ''} ${createBookingForm.lastName}`.trim();

                    const response = await fetch('/api/bookings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        guestName,
                        checkIn: createBookingForm.checkIn,
                        checkOut: createBookingForm.checkOut,
                        numberOfGuests: createBookingForm.numberOfGuests,
                        paymentMode: createBookingForm.paymentMode,
                        selectedRooms: createBookingForm.selectedRooms,
                        optional,
                        rental,
                        cottage,
                        nights,
                        status: 'Confirmed', // Super Admin creates confirmed bookings
                        paymentStatus: 'Pending'
                      })
                    });

                    if (!response.ok) {
                      throw new Error('Failed to create booking');
                    }

                    const newBookingData = await response.json();
                    setBookings([...bookings, newBookingData]);
                    success('✅ Booking created successfully!');

                    // Reset form
                    setShowCreateBookingModal(false);
                    setCreateBookingStep(1);
                    setCreateBookingForm({
                      firstName: '',
                      middleName: '',
                      lastName: '',
                      checkIn: '',
                      checkOut: '',
                      numberOfGuests: 1,
                      paymentMode: 'cash',
                      selectedRooms: {},
                      selectedRoomDetails: {},
                      selectedAmenities: { optional: {}, rental: {}, cottage: null },
                    });
                    await fetchBookings();
                  } catch (err) {
                    console.error('❌ Booking Error:', err);
                    error(`❌ Booking Failed: ${err.message}`);
                  } finally {
                    submittingRef.current = false;
                    setShowSubmitModal(false);
                  }
                }}
              >
                {createBookingStep === 1 && (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-start' }}>
                        <div style={{ flex: '0 0 300px' }}>
                          {/* Left side - Calendar */}
                          <BookingCalendar
                            availabilityData={availabilityData}
                            onDateChange={({ checkInDate, checkOutDate }) => {
                              setCreateBookingForm(prev => ({
                                ...prev,
                                checkIn: checkInDate ? formatDate(checkInDate) : '',
                                checkOut: checkOutDate ? formatDate(checkOutDate) : ''
                              }));
                            }}
                            checkIn={createBookingForm.checkIn ? new Date(createBookingForm.checkIn) : null}
                            checkOut={createBookingForm.checkOut ? new Date(createBookingForm.checkOut) : null}
                          />
                        </div>
                        
                        <div style={{ flex: '1' }}>
                          {/* Right side - Guest Info and Dates */}
                          <div style={{ 
                            backgroundColor: '#FFF7ED',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid rgba(254, 190, 82, 0.3)'
                          }}>
                            <div style={{ marginBottom: '15px' }}>
                              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                Guest Information
                              </label>
                              
                              {/* First Name */}
                              <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#374151' }}>
                                  First Name <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                  type="text"
                                  name="firstName"
                                  value={createBookingForm.firstName}
                                  onChange={(e) => setCreateBookingForm(prev => ({ ...prev, firstName: e.target.value }))}
                                  required
                                  placeholder="Enter first name"
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>

                              {/* Middle Name */}
                              <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#374151' }}>
                                  Middle Name (Optional)
                                </label>
                                <input
                                  type="text"
                                  name="middleName"
                                  value={createBookingForm.middleName}
                                  onChange={(e) => setCreateBookingForm(prev => ({ ...prev, middleName: e.target.value }))}
                                  placeholder="Enter middle name"
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>

                              {/* Last Name */}
                              <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#374151' }}>
                                  Last Name <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                  type="text"
                                  name="lastName"
                                  value={createBookingForm.lastName}
                                  onChange={(e) => setCreateBookingForm(prev => ({ ...prev, lastName: e.target.value }))}
                                  required
                                  placeholder="Enter last name"
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                              <div style={{ flex: '1' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                                  Number of Guests <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                  type="number"
                                  name="numberOfGuests"
                                  min="1"
                                  value={createBookingForm.numberOfGuests}
                                  onChange={(e) => setCreateBookingForm(prev => ({ ...prev, numberOfGuests: parseInt(e.target.value) || 1 }))}
                                  required
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                  }}
                                />
                              </div>
                              
                              {/* Payment Mode */}
                              <div style={{ flex: '1' }}>
                                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                                  Payment Mode <span style={{ color: 'red' }}>*</span>
                                </label>
                                <select
                                  name="paymentMode"
                                  value={createBookingForm.paymentMode}
                                  onChange={(e) => setCreateBookingForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                                  required
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                  }}
                                >
                                  <option value="cash">Cash</option>
                                  <option value="gcash">GCash</option>
                                  <option value="card">Card</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                              <div style={{ flex: '1' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Check-in:</p>
                                <div style={{ 
                                  padding: '8px', 
                                  backgroundColor: '#fff',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}>
                                  {createBookingForm.checkIn ? new Date(createBookingForm.checkIn).toLocaleDateString() : 'Select date'}
                                </div>
                              </div>
                              <div style={{ flex: '1' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Check-out:</p>
                                <div style={{ 
                                  padding: '8px', 
                                  backgroundColor: '#fff',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}>
                                  {createBookingForm.checkOut ? new Date(createBookingForm.checkOut).toLocaleDateString() : 'Select date'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {dateWarning && (
                            <div style={{ 
                              color: '#856404', 
                              backgroundColor: '#fff3cd', 
                              padding: '10px', 
                              borderRadius: '4px',
                              marginTop: '10px',
                              border: '1px solid #ffeeba',
                              fontSize: '14px'
                            }}>
                              {dateWarning}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Room Selection Below Calendar */}
                      {!dateWarning && createBookingForm.checkIn && createBookingForm.checkOut && (
                        <div style={{ marginTop: '20px' }}>
                          <h3 style={{ marginBottom: '15px', color: '#5a3e00' }}>Available Rooms</h3>
                          {loadingRooms ? (
                            <div style={{ position: 'relative', height: '100px' }}>
                              <Loading size="medium" text="Loading rooms..." />
                            </div>
                          ) : availableRooms.length === 0 ? (
                            <p>No rooms available for the selected dates.</p>
                          ) : (
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
                              gap: '20px' 
                            }}>
                              {availableRooms
                                .filter(room => room.type !== 'FAMILY_LODGE')
                                .map((room) => {
                                const selectedQty = createBookingForm.selectedRooms[room.id] || 0;
                                const isFull = room.remaining <= 0;
                                const isSelected = selectedQty > 0;

                                // Calculate total capacity of all selected rooms
                                const totalCapacity = Object.entries(createBookingForm.selectedRooms).reduce((acc, [roomId, qty]) => {
                                  const r = availableRooms.find(r => r.id === roomId);
                                  if (!r) return acc;
                                  let capacity = 0;
                                  if (r.type === 'TEPEE') capacity = 5;
                                  else if (r.type === 'LOFT') capacity = 3;
                                  else if (r.type === 'VILLA') capacity = 10;
                                  return acc + (capacity * qty);
                                }, 0);

                                const isCapacitySatisfied = totalCapacity >= createBookingForm.numberOfGuests;
                                const isDisabled = (isFull || (isCapacitySatisfied && !isSelected));
                                
                                const roomCapacity = room.type === 'TEPEE' ? 5 : room.type === 'LOFT' ? 3 : room.type === 'VILLA' ? 10 : 1;

                                return (
                                  <div
                                    key={room.id}
                                    style={{
                                      border: isSelected ? '2px solid #FEBE52' : '1px solid #d1d5db',
                                      borderRadius: '12px',
                                      padding: '0',
                                      backgroundColor: 'white',
                                      cursor: (isFull || isDisabled) ? 'not-allowed' : 'pointer',
                                      opacity: (isFull || (isDisabled && !isSelected)) ? 0.5 : 1,
                                      transition: 'all 0.2s ease',
                                      overflow: 'hidden',
                                      position: 'relative'
                                    }}
                                    onClick={() => {
                                      if (isDisabled && !isSelected) return;
                                      setCreateBookingForm(prev => {
                                        const selectedRooms = { ...prev.selectedRooms };
                                        const selectedRoomDetails = { ...prev.selectedRoomDetails };
                                        const currentCapacity = Object.entries(selectedRooms).reduce((acc, [rId, qty]) => {
                                          const r = availableRooms.find(r => r.id === rId);
                                          if (!r) return acc;
                                          let cap = 0;
                                          if (r.type === 'TEPEE') cap = 5;
                                          else if (r.type === 'LOFT') cap = 3;
                                          else if (r.type === 'VILLA') cap = 10;
                                          return acc + (cap * qty);
                                        }, 0);

                                        if (!selectedRooms[room.id]) {
                                          // Adding a room
                                          selectedRooms[room.id] = 1;
                                          selectedRoomDetails[room.id] = {
                                            name: room.name,
                                            type: room.type,
                                            price: room.price,
                                            image: room.image,
                                            remaining: room.remaining
                                          };
                                        } else {
                                          // Removing a room
                                          delete selectedRooms[room.id];
                                          delete selectedRoomDetails[room.id];
                                        }
                                        return { ...prev, selectedRooms, selectedRoomDetails };
                                      });
                                    }}
                                  >
                                    <div style={{ position: 'relative' }}>
                                      <img 
                                        src={room.image || '/images/default-room.jpg'} 
                                        alt={room.name}
                                        style={{
                                          width: '100%',
                                          height: '140px',
                                          objectFit: 'cover'
                                        }}
                                      />
                                      {/* Availability Badge */}
                                      <span style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        backgroundColor: isFull ? '#ef4444' : room.remaining <= 3 ? '#f59e0b' : '#10b981',
                                        color: 'white',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                      }}>
                                        {isFull ? 'Full' : `${room.remaining} left`}
                                      </span>
                                      {/* Selected Indicator */}
                                      {isSelected && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '8px',
                                          left: '8px',
                                          backgroundColor: '#FEBE52',
                                          color: 'white',
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '50%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '16px',
                                          fontWeight: 'bold',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                        }}>
                                          ✓
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ padding: '12px' }}>
                                      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                        {room.name}
                                      </h4>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                        {/* Room Type Tag */}
                                        <span style={{
                                          backgroundColor: '#e5e7eb',
                                          color: '#374151',
                                          padding: '3px 8px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          textTransform: 'uppercase'
                                        }}>
                                          {room.type}
                                        </span>
                                        {/* Capacity Tag */}
                                        <span style={{
                                          backgroundColor: '#dbeafe',
                                          color: '#1e40af',
                                          padding: '3px 8px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '3px'
                                        }}>
                                          👥 {roomCapacity} guests
                                        </span>
                                      </div>
                                      {/* Price */}
                                      <p style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold', color: '#FEBE52' }}>
                                        ₱{(room.price / 100).toLocaleString()}<span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>/night</span>
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderTop: '1px solid #e5e7eb',
                                        backgroundColor: '#fef3c7'
                                      }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCreateBookingForm(prev => {
                                              const selectedRooms = { ...prev.selectedRooms };
                                              const selectedRoomDetails = { ...prev.selectedRoomDetails };
                                              if (selectedRooms[room.id] > 1) {
                                                selectedRooms[room.id] = selectedRooms[room.id] - 1;
                                              }
                                              return { ...prev, selectedRooms, selectedRoomDetails };
                                            });
                                          }}
                                          disabled={selectedQty <= 1}
                                          style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: '2px solid #FEBE52',
                                            backgroundColor: 'white',
                                            color: '#FEBE52',
                                            cursor: selectedQty <= 1 ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: selectedQty <= 1 ? 0.5 : 1
                                          }}
                                        >
                                          −
                                        </button>
                                        <span style={{ 
                                          fontWeight: 'bold', 
                                          fontSize: '16px',
                                          minWidth: '30px',
                                          textAlign: 'center',
                                          color: '#92400e'
                                        }}>
                                          {selectedQty}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCreateBookingForm(prev => {
                                              const selectedRooms = { ...prev.selectedRooms };
                                              const selectedRoomDetails = { ...prev.selectedRoomDetails };
                                              if ((selectedRooms[room.id] || 0) < room.remaining) {
                                                selectedRooms[room.id] = (selectedRooms[room.id] || 0) + 1;
                                              }
                                              return { ...prev, selectedRooms, selectedRoomDetails };
                                            });
                                          }}
                                          disabled={selectedQty >= room.remaining}
                                          style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: 'none',
                                            backgroundColor: '#FEBE52',
                                            color: 'white',
                                            cursor: selectedQty >= room.remaining ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: selectedQty >= room.remaining ? 0.5 : 1
                                          }}
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {createBookingStep === 2 && (
                  <>
                    <h3 style={{ color: '#5a3e00', marginBottom: '20px' }}>Room Amenities</h3>
                    <div style={{ 
                      backgroundColor: '#FFF8E1',
                      padding: '20px',
                      borderRadius: '8px',
                      border: '1px solid rgba(251, 190, 82, 0.3)'
                    }}>
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ color: '#5a3e00', marginBottom: '15px' }}>Selected Rooms:</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                          const room = availableRooms.find(r => r.id === roomId);
                          if (!room) return null;
                          return (
                            <div key={`selected-room-${roomId}`}>
                              {room.name} x{quantity}
                            </div>
                          );
                        })}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: '20px' }}>
                        {/* Room Type Based Amenities */}
                        {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                          const room = availableRooms.find(r => r.id === roomId);
                          if (!room) return null;
                          return (
                            <div key={roomId}>
                              <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>{room.name} Included Amenities:</h4>
                              <RoomAmenitiesSelector
                                roomTypes={[room.type]}
                                selectedAmenities={createBookingForm.selectedAmenities}
                                onAmenitiesChange={(newAmenities) => setCreateBookingForm(prev => ({ 
                                  ...prev, 
                                  selectedAmenities: newAmenities 
                                }))}
                                showIncludedOnly={true}
                              />
                            </div>
                          );
                        })}

                        {/* Optional Amenities */}
                        <div>
                          <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Optional Amenities:</h4>
                          <OptionalAmenitiesSelector
                            selectedAmenities={createBookingForm.selectedAmenities.optional}
                            onAmenitiesChange={(newOptional) => setCreateBookingForm(prev => ({ 
                              ...prev, 
                              selectedAmenities: {
                                ...prev.selectedAmenities,
                                optional: newOptional
                              }
                            }))}
                          />
                        </div>

                        {/* Rental Amenities */}
                        <div>
                          <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Rental Amenities:</h4>
                          <RentalAmenitiesSelector
                            selectedAmenities={createBookingForm.selectedAmenities.rental}
                            onAmenitiesChange={(newRental) => setCreateBookingForm(prev => ({ 
                              ...prev, 
                              selectedAmenities: {
                                ...prev.selectedAmenities,
                                rental: newRental
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {createBookingStep === 3 && (
                  <>
                    <h3 style={{ color: '#5a3e00', marginBottom: '20px' }}>Booking Summary</h3>
                    <div style={{ 
                      backgroundColor: '#FFF8E1',
                      padding: '20px',
                      borderRadius: '8px',
                      border: '1px solid rgba(251, 190, 82, 0.3)'
                    }}>
                      {/* Guest Information */}
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Guest Information</h4>
                        <div style={{ display: 'grid', gap: '10px' }}>
                          <div>
                            <strong>Guest Name:</strong> {createBookingForm.firstName} {createBookingForm.middleName && createBookingForm.middleName + ' '}{createBookingForm.lastName}
                          </div>
                          <div>
                            <strong>Number of Guests:</strong> {createBookingForm.numberOfGuests}
                          </div>
                          <div>
                            <strong>Payment Mode:</strong> {createBookingForm.paymentMode.charAt(0).toUpperCase() + createBookingForm.paymentMode.slice(1).replace('_', ' ')}
                          </div>
                          <div>
                            <strong>Check-in:</strong> {new Date(createBookingForm.checkIn).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Check-out:</strong> {new Date(createBookingForm.checkOut).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Duration:</strong> {Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24))} nights
                          </div>
                        </div>
                      </div>

                      {/* Selected Rooms */}
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Selected Rooms</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                            const roomDetails = createBookingForm.selectedRoomDetails[roomId];
                            if (!roomDetails) return null;
                            return (
                              <div key={roomId} style={{
                                padding: '8px 12px',
                                backgroundColor: 'rgba(251, 190, 82, 0.1)',
                                borderRadius: '6px',
                                border: '1px solid rgba(251, 190, 82, 0.3)',
                                fontSize: '14px'
                              }}>
                                {roomDetails.name} x{quantity}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Amenities */}
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Selected Amenities</h4>
                        <div style={{ display: 'grid', gap: '10px' }}>
                          {/* Optional Amenities */}
                          {Object.entries(createBookingForm.selectedAmenities.optional || {}).some(([_, qty]) => qty > 0) && (
                            <div>
                              <strong>Optional Amenities:</strong>
                              <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                                {Object.entries(createBookingForm.selectedAmenities.optional).map(([amenityId, quantity]) => {
                                  if (!quantity) return null;
                                  const amenity = optionalAmenitiesData.find(a => a.id === parseInt(amenityId));
                                  const amenityName = amenity ? amenity.name : `Optional Amenity ${amenityId}`;
                                  return (
                                    <li key={amenityId}>{amenityName} x{quantity}</li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Rental Amenities */}
                          {Object.entries(createBookingForm.selectedAmenities.rental || {}).some(([_, sel]) => (sel.quantity || 0) > 0 || (sel.hoursUsed || 0) > 0) && (
                            <div>
                              <strong>Rental Amenities:</strong>
                              <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                                {Object.entries(createBookingForm.selectedAmenities.rental).map(([amenityId, selection]) => {
                                  const quantity = selection.quantity || 0;
                                  const hoursUsed = selection.hoursUsed || 0;
                                  if (quantity === 0 && hoursUsed === 0) return null;
                                  const amenity = rentalAmenitiesData.find(a => a.id === parseInt(amenityId));
                                  if (!amenity) return null;
                                  const displayText = hoursUsed > 0 ? `${quantity} x ${hoursUsed}h` : `${quantity} x ${amenity.unitType || 'units'}`;
                                  return (
                                    <li key={amenityId}>{amenity.name}: {displayText}</li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div style={{ 
                        backgroundColor: 'white',
                        padding: '15px',
                        borderRadius: '6px',
                        border: '1px solid rgba(251, 190, 82, 0.2)'
                      }}>
                        <h4 style={{ color: '#5a3e00', marginBottom: '15px' }}>Price Breakdown</h4>
                        
                        {/* Room Costs */}
                        {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                          const roomDetails = createBookingForm.selectedRoomDetails[roomId];
                          if (!roomDetails) return null;
                          const nights = Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24));
                          const roomTotal = (roomDetails.price * quantity * nights);
                          return (
                            <div key={roomId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span>{roomDetails.name} x{quantity} ({nights} nights)</span>
                              <span>₱{(roomTotal / 100).toFixed(2)}</span>
                            </div>
                          );
                        })}                        {/* Optional Amenities */}
                        {Object.entries(createBookingForm.selectedAmenities.optional).map(([amenityId, quantity]) => {
                          const amenity = optionalAmenitiesData.find(a => a.id === parseInt(amenityId));
                          if (!quantity) return null;
                          const amenityName = amenity ? amenity.name : `Optional Amenity ${amenityId}`;
                          const amenityPrice = amenity ? Number(amenity.price || 0) : 0;
                          return (
                            <div key={amenityId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span>{amenityName} x{quantity}</span>
                              <span>₱{((amenityPrice * quantity) / 100).toFixed(2)}</span>
                            </div>
                          );
                        })}

                        {/* Rental Amenities */}
                        {Object.entries(createBookingForm.selectedAmenities.rental).map(([amenityId, details]) => {
                          const amenity = rentalAmenitiesData.find(a => a.id === amenityId);
                          if (!amenity || !details.quantity) return null;
                          const total = amenity.price * details.quantity * (details.hoursUsed || 1);
                          return (
                            <div key={amenityId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span>{amenity.name} x{details.quantity} ({details.hoursUsed || 1}h)</span>
                              <span>₱{(total / 100).toFixed(2)}</span>
                            </div>
                          );
                        })}

                        {/* Total */}
                        <div style={{ 
                          borderTop: '2px solid rgba(251, 190, 82, 0.3)', 
                          marginTop: '15px', 
                          paddingTop: '15px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 'bold',
                          fontSize: '18px',
                          color: '#5a3e00'
                        }}>
                          <span>Total Amount</span>
                          <span>₱{(createTotalPrice / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                  {createBookingStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCreateBookingStep(step => Math.max(1, step - 1))}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ccc',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Back
                    </button>
                  )}
                  {createBookingStep < 3 && (
                    <button
                      type="button"
                      onClick={() => setCreateBookingStep(step => Math.min(3, step + 1))}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#FEBE52',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#fff',
                        fontWeight: 'bold',
                      }}
                    >
                      Next
                    </button>
                  )}
                  {createBookingStep === 3 && (
                    <button
                      type="submit"
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#FEBE52',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#fff',
                        fontWeight: 'bold',
                      }}
                    >
                      Create
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateBookingModal(false);
                      setCreateBookingStep(1);
                      setCreateBookingForm({
                        firstName: '',
                        middleName: '',
                        lastName: '',
                        checkIn: '',
                        checkOut: '',
                        numberOfGuests: 1,
                        paymentMode: 'cash',
                        selectedRooms: {},
                        selectedRoomDetails: {},
                        selectedAmenities: { optional: {}, rental: {}, cottage: null },
                      });
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ccc',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>

                {/* Live Total Display - Bottom Left */}
                {createTotalPrice > 0 && (
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '20px', 
                    left: '20px', 
                    fontWeight: 'bold', 
                    fontSize: '1.2rem', 
                    color: '#ED7709',
                    backgroundColor: 'rgba(255, 248, 225, 0.9)',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    border: '1px solid #FEBE52'
                  }}>
                    Total Price: ₱{(createTotalPrice / 100).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Modern Bookings Display */}
        <div style={styles.bookingsCard}>
          {viewMode === 'table' ? (
            /* Modern Table View */
            <div style={styles.tableContainer}>
              <div style={styles.tableHeader}>
                <h3 style={styles.tableTitle}>
                  {currentTab === 'active' ? 'Active Bookings' : 'Booking History'}
                </h3>
                <div style={styles.tableActions}>
                  <button 
                    onClick={() => handleBulkAction('settings')}
                    style={styles.bulkActionButton}
                  >
                    <Settings size={16} />
                    Bulk Actions
                  </button>
                </div>
              </div>
              
              <div style={styles.tableWrapper}>
                {loading ? (
                  <div style={{ 
                    position: 'relative', 
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8fafc'
                  }}>
                    <Loading size="large" text="Loading bookings..." />
                  </div>
                ) : (
                  <table style={styles.modernTable}>
                    <thead style={styles.tableHead}>
                      <tr>
                        <th style={styles.tableHeadCell}>
                          <div style={styles.tableHeadContent}>
                            <input 
                              type="checkbox" 
                              style={styles.headerCheckbox}
                              checked={selectedBookings.length === paginatedBookings.length && paginatedBookings.length > 0}
                              onChange={toggleSelectAll}
                            />
                            Guest
                            <ArrowUpDown size={14} />
                          </div>
                        </th>
                        <th style={styles.tableHeadCell}>
                          <div style={styles.tableHeadContent}>
                            Dates
                            <ArrowUpDown size={14} />
                          </div>
                        </th>
                        <th style={styles.tableHeadCell}>
                          <div style={styles.tableHeadContent}>
                            Room & Guests
                            <ArrowUpDown size={14} />
                          </div>
                        </th>
                        <th style={styles.tableHeadCell}>
                          <div style={styles.tableHeadContent}>
                            Status
                            <ArrowUpDown size={14} />
                          </div>
                        </th>
                        <th style={styles.tableHeadCell}>
                          <div style={styles.tableHeadContent}>
                            Payment
                            <ArrowUpDown size={14} />
                          </div>
                        </th>
                        <th style={styles.tableHeadCell}>
                          <div style={styles.tableHeadContent}>
                            Total
                            <ArrowUpDown size={14} />
                          </div>
                        </th>
                        <th style={styles.tableHeadCell}>Actions</th>
                      </tr>
                    </thead>
                    <tbody style={styles.tableBody}>
                      {currentTab === 'active' ? (
                        paginatedBookings.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={styles.emptyState}>
                              <Calendar size={48} style={{ color: '#94a3b8' }} />
                              <h3>No active bookings found</h3>
                              <p>Create a new booking to get started</p>
                            </td>
                          </tr>
                        ) : (
                          paginatedBookings.filter(booking => booking).map((booking) => (
                            <tr key={`booking-${booking.id}`} style={styles.tableRow}>
                              <td style={styles.tableCell}>
                                <div style={styles.guestInfo}>
                                  <input 
                                    type="checkbox" 
                                    style={styles.rowCheckbox}
                                    checked={selectedBookings.includes(booking.id)}
                                    onChange={() => toggleBookingSelection(booking.id)}
                                  />
                                  <div style={styles.guestAvatar}>
                                    {booking.guestName?.charAt(0).toUpperCase()}
                                  </div>
                                  <div style={styles.guestDetails}>
                                    <div style={styles.guestName}>{booking.guestName}</div>
                                    <div style={styles.bookingId}>#{booking.id}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={styles.tableCell}>
                                <div style={styles.dateInfo}>
                                  <div style={styles.checkInDate}>
                                    <Calendar size={14} />
                                    {new Date(booking.checkIn).toLocaleDateString('en-US', { 
                                      month: 'short', day: 'numeric' 
                                    })}
                                  </div>
                                  <div style={styles.checkOutDate}>
                                    <Clock size={14} />
                                    {new Date(booking.checkOut).toLocaleDateString('en-US', { 
                                      month: 'short', day: 'numeric' 
                                    })}
                                  </div>
                                  <div style={styles.duration}>
                                    {Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))} nights
                                  </div>
                                </div>
                              </td>
                              <td style={styles.tableCell}>
                                <div style={styles.roomInfo}>
                                  <div style={styles.roomName}>
                                    <MapPin size={14} />
                                    {booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0 
                                      ? booking.rooms.map(r => r.room.name).join(', ') 
                                      : 'N/A'
                                    }
                                  </div>
                                  <div style={styles.guestCount}>
                                    <Users size={14} />
                                    {booking.numberOfGuests || 1} guests
                                  </div>
                                </div>
                              </td>
                              <td style={styles.tableCell}>
                                <div style={styles.statusContainer}>
                                  <span style={{
                                    ...styles.statusBadge,
                                    ...getStatusStyle(booking.status)
                                  }}>
                                    {getStatusIcon(booking.status)}
                                    {booking.status}
                                  </span>
                                  <div style={styles.paymentStatus}>
                                    {booking.paymentOption || 'Pending'}
                                  </div>
                                </div>
                              </td>
                              <td style={styles.tableCell}>
                                <div style={styles.paymentInfo}>
                                  <div style={styles.paidAmount}>
                                    Paid: ₱{((Number(booking.totalPaid) || 0) / 100).toLocaleString()}
                                  </div>
                                  <div style={styles.balanceAmount}>
                                    Balance: ₱{((Number(booking.balanceToPay) || 0) / 100).toLocaleString()}
                                  </div>
                                </div>
                              </td>
                              <td style={styles.tableCell}>
                                <div style={styles.totalAmount}>
                                  ₱{(Number(booking.totalCostWithAddons || booking.totalPrice) / 100).toLocaleString()}
                                </div>
                              </td>
                              <td style={styles.tableCell}>
                                <div style={styles.actionButtons}>
                                  <button
                                    onClick={() => {
                                      setCurrentBooking(booking);
                                      setShowDetailsModal(true);
                                    }}
                                    style={styles.actionButton}
                                    title="View Details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  {/* Edit button hidden as per requirements */}
                                  {/* <button
                                    onClick={() => handleEdit(booking)}
                                    style={styles.actionButton}
                                    title="Edit Booking"
                                  >
                                    <Edit size={16} />
                                  </button> */}
                                  <button
                                    style={styles.actionButtonDanger}
                                    title="Cancel Booking"
                                    onClick={() => {
                                      setCurrentBooking(booking);
                                      setShowCancelModal(true);
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleMoreActions(booking)}
                                    style={styles.actionButton}
                                    title="More Actions"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        /* History bookings content will be similar but filtered */
                        <tr>
                          <td colSpan={7} style={styles.emptyState}>
                            <Clock size={48} style={{ color: '#94a3b8' }} />
                            <h3>No booking history</h3>
                            <p>Completed bookings will appear here</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            /* Cards View */
            <div style={styles.cardsContainer}>
              <div style={styles.cardsGrid}>
                {currentTab === 'active' ? (
                  paginatedBookings.length === 0 ? (
                    <div style={styles.emptyCards}>
                      <Calendar size={64} style={{ color: '#94a3b8' }} />
                      <h3>No active bookings</h3>
                      <p>Create a new booking to get started</p>
                    </div>
                  ) : (
                    paginatedBookings.filter(booking => booking).map((booking) => (
                      <div key={`card-${booking.id}`} style={styles.bookingCard}>
                        <div style={styles.cardHeader}>
                          <div style={styles.cardGuestInfo}>
                            <div style={styles.cardAvatar}>
                              {booking.guestName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 style={styles.cardGuestName}>{booking.guestName}</h4>
                              <p style={styles.cardBookingId}>#{booking.id}</p>
                            </div>
                          </div>
                          <span style={{
                            ...styles.cardStatusBadge,
                            ...getStatusStyle(booking.status)
                          }}>
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </span>
                        </div>
                        
                        <div style={styles.cardContent}>
                          <div style={styles.cardRow}>
                            <div style={styles.cardIcon}>
                              <Calendar size={16} />
                            </div>
                            <div>
                              <strong>Check-in:</strong> {new Date(booking.checkIn).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={styles.cardRow}>
                            <div style={styles.cardIcon}>
                              <Clock size={16} />
                            </div>
                            <div>
                              <strong>Check-out:</strong> {new Date(booking.checkOut).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={styles.cardRow}>
                            <div style={styles.cardIcon}>
                              <MapPin size={16} />
                            </div>
                            <div>
                              <strong>Room:</strong> {booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0 
                                ? booking.rooms.map(r => r.room.name).join(', ') 
                                : 'N/A'
                              }
                            </div>
                          </div>
                          <div style={styles.cardRow}>
                            <div style={styles.cardIcon}>
                              <Users size={16} />
                            </div>
                            <div>
                              <strong>Guests:</strong> {booking.numberOfGuests || 1}
                            </div>
                          </div>
                          <div style={styles.cardRow}>
                            <div style={styles.cardIcon}>
                              <DollarSign size={16} />
                            </div>
                            <div>
                              <strong>Total:</strong> ₱{(Number(booking.totalCostWithAddons || booking.totalPrice) / 100).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div style={styles.cardActions}>
                          <button
                            onClick={() => {
                              setCurrentBooking(booking);
                              setShowDetailsModal(true);
                            }}
                            style={styles.cardActionButton}
                          >
                            <Eye size={16} />
                            View Details
                          </button>
                          {/* Edit button hidden as per requirements */}
                          {/* <button
                            onClick={() => handleEdit(booking)}
                            style={styles.cardActionButton}
                          >
                            <Edit size={16} />
                            Edit
                          </button> */}
                          <button
                            onClick={() => {
                              setCurrentBooking(booking);
                              setShowCancelModal(true);
                            }}
                            style={styles.cardActionButtonDanger}
                          >
                            <Trash2 size={16} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div style={styles.emptyCards}>
                    <Clock size={64} style={{ color: '#94a3b8' }} />
                    <h3>No booking history</h3>
                    <p>Completed bookings will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {currentTab === 'active' && totalPages > 1 && (
          <div style={styles.paginationContainer}>
            <div style={styles.paginationInfo}>
              Showing {((currentPage - 1) * BOOKINGS_PER_PAGE) + 1} to {Math.min(currentPage * BOOKINGS_PER_PAGE, bookings.length)} of {bookings.length} bookings
            </div>
            <div style={styles.paginationControls}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  ...styles.paginationButton,
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    ...styles.paginationButton,
                    ...(page === currentPage ? styles.paginationButtonActive : {})
                  }}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  ...styles.paginationButton,
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Cancel Booking Modal */}
        {showCancelModal && currentBooking && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backdropFilter: 'blur(5px)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
                padding: '20px',
                borderRadius: '8px',
                width: '400px',
                maxWidth: '90%',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              }}
            >
              <h3>Cancel Booking</h3>
              <p>Are you sure you want to cancel the booking for {currentBooking.guestName}? This action cannot be undone.</p>
              <label>
                Remarks/Comments:
                <textarea
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  placeholder="Explain why the booking is being cancelled..."
                  style={{
                    width: '100%',
                    height: '80px',
                    marginTop: '10px',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </label>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelRemarks('');
                    setCurrentBooking(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleCancelWithRemarks(currentBooking.id, cancelRemarks);
                    setShowCancelModal(false);
                    setCancelRemarks('');
                    setCurrentBooking(null);
                    // Disable actions after cancellation
                    setBookings(prev => prev.map(b => b.id === currentBooking.id ? { ...b, status: 'Cancelled' } : b));
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Professional Booking Details Modal */}
        {showDetailsModal && currentBooking && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '1rem',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDetailsModal(false);
                setCurrentBooking(null);
              }
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.98)',
                padding: '2rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.3)',
                position: 'relative',
                animation: 'modalSlideIn 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Professional Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(0,0,0,0.1)'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    margin: 0,
                    background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    Booking Details
                  </h3>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    Booking ID: {currentBooking.id}
                  </p>
                </div>
                <button
                  style={{
                    background: 'rgba(107, 114, 128, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    fontSize: '1.25rem',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px'
                  }}
                  onClick={() => {
                    setShowDetailsModal(false);
                    setCurrentBooking(null);
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.target.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(107, 114, 128, 0.1)';
                    e.target.style.color = '#6b7280';
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Check-in:</strong> {new Date(currentBooking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Check-out:</strong> {new Date(currentBooking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Guests:</strong> {currentBooking.numberOfGuests || 'N/A'}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Selected Rooms:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {currentBooking.rooms && Array.isArray(currentBooking.rooms) && currentBooking.rooms.length > 0 ? 
                    currentBooking.rooms.map((r) => (
                      <li key={`room-${r.room.id}`}>{r.room.name} x{r.quantity}</li>
                    )) : 
                    <li>No rooms selected</li>
                  }
                </ul>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Selected Amenities:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {currentBooking.optionalAmenities && Array.isArray(currentBooking.optionalAmenities) && currentBooking.optionalAmenities.length > 0 ? 
                    currentBooking.optionalAmenities.map((oa) => (
                      <li key={`optional-${oa.optionalAmenity.id}`}>{oa.optionalAmenity.name} x{oa.quantity}</li>
                    )) : 
                    <li>No optional amenities selected</li>
                  }
                  {currentBooking.rentalAmenities && Array.isArray(currentBooking.rentalAmenities) && currentBooking.rentalAmenities.length > 0 ? 
                    currentBooking.rentalAmenities.map((ra) => (
                      <li key={`rental-${ra.rentalAmenity.id}`}>{ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed}h)` : ''}</li>
                    )) : 
                    <li>No rental amenities selected</li>
                  }
                </ul>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Price Breakdown:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {(() => {
                    const nights = Math.max(1, (new Date(currentBooking.checkOut) - new Date(currentBooking.checkIn)) / (1000 * 60 * 60 * 24));
                    return (
                      <>
                        {currentBooking.rooms && Array.isArray(currentBooking.rooms) && currentBooking.rooms.map((r, idx) => {
                          const roomTotal = Number(r.room.price) * r.quantity * nights;
                          return (
                            <li key={`room-${idx}`}>
                              {r.room.name} x{r.quantity} ({nights} nights): ₱{(roomTotal / 100).toFixed(0)}
                            </li>
                          );
                        })}
                        {currentBooking.optionalAmenities && Array.isArray(currentBooking.optionalAmenities) && currentBooking.optionalAmenities.map((oa, idx) => {
                          const optionalTotal = (Number(oa.optionalAmenity.price || 0) * oa.quantity);
                          return (
                            <li key={`amenity-${idx}`}>
                              {oa.optionalAmenity.name} x{oa.quantity}: ₱{(optionalTotal / 100).toFixed(0)}
                            </li>
                          );
                        })}
                        {currentBooking.rentalAmenities && Array.isArray(currentBooking.rentalAmenities) && currentBooking.rentalAmenities.map((ra, idx) => (
                          <li key={`rental-${idx}`}>
                            {ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed}h)` : ''}: ₱{(Number(ra.totalPrice) / 100).toFixed(0)}
                          </li>
                        ))}
                        <li style={{ marginTop: '10px', fontWeight: 'bold' }}>
                          Total Price: ₱{(Number(currentBooking.totalCostWithAddons || currentBooking.totalPrice) / 100).toFixed(0)}
                        </li>
                      </>
                    );
                  })()}
                </ul>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {/* Confirm and Cancel for new bookings (not confirmed or checked in/out) */}
                {(['Pending', 'PENDING', 'HELD', 'Held', 'NEW', 'New'].includes(currentBooking.status) && !currentBooking.actualCheckIn) && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowConfirmModal(true);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowCancelModal(true);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ffc107',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {/* Check In, Check Out, Cancel for confirmed but not checked in */}
                {(currentBooking.status === 'Confirmed' && !currentBooking.actualCheckIn) && (
                  <>
                    <button
                      onClick={async () => {
                        const today = new Date();
                        const checkInDate = new Date(currentBooking.checkIn);
                        if (today < new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())) {
                          setOverrideModal({
                            show: true,
                            type: 'checkin',
                            date: checkInDate,
                            bookingId: currentBooking.id
                          });
                          return;
                        }
                        await handleCheckIn(currentBooking.id);
                        setShowDetailsModal(false);
                        setCurrentBooking(null);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#56A86B',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Check In
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowCancelModal(true);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ffc107',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {/* Check Out only after check-in (actualCheckIn set, not checked out) */}
                {(currentBooking.status === 'Confirmed' && currentBooking.actualCheckIn && !currentBooking.actualCheckOut) && (
                  <button
                    onClick={async () => {
                      const today = new Date();
                      const checkOutDate = new Date(currentBooking.checkOut);
                      if (today < new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate())) {
                        setOverrideModal({
                          show: true,
                          type: 'checkout',
                          date: checkOutDate,
                          bookingId: currentBooking.id
                        });
                        return;
                      }
                      await handleCheckOut(currentBooking.id);
                      setShowDetailsModal(false);
                      setCurrentBooking(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#E74C3C',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Check Out
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Override Modal for Super Admin (shared) */}
        <OverrideModal
          modal={overrideModal}
          setModal={setOverrideModal}
          onConfirm={async () => {
            if (overrideModal.type === 'checkin') {
              await handleCheckIn(overrideModal.bookingId);
            } else if (overrideModal.type === 'checkout') {
              await handleCheckOut(overrideModal.bookingId);
            }
            setShowDetailsModal(false);
            setCurrentBooking(null);
          }}
        />

        {/* Confirmation Modal */}
        {showConfirmModal && currentBooking && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
                padding: '20px',
                borderRadius: '8px',
                width: '400px',
                maxWidth: '90%',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              }}
            >
              <h3>Confirm Booking</h3>
              <p>Are you sure you want to confirm this booking?</p>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  No
                </button>
                <button
                  onClick={async () => {
                    await handleStatusChange(currentBooking.id, 'Confirmed');
                    setShowConfirmModal(false);
                    setCurrentBooking(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Details Modal */}
        {showHistoryModal && historyBookingDetails && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
                padding: '20px',
                borderRadius: '8px',
                width: '600px',
                maxWidth: '90%',
                maxHeight: '80%',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              }}
            >
              <h3>Booking Details</h3>
              <div style={{ marginBottom: '10px' }}>
                <strong>Guest Name:</strong> {historyBookingDetails.guestName}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Check-in:</strong> {new Date(historyBookingDetails.checkIn).toLocaleDateString()}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Check-out:</strong> {new Date(historyBookingDetails.checkOut).toLocaleDateString()}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Rooms:</strong> {historyBookingDetails.rooms.length > 0 ? historyBookingDetails.rooms.map(r => r.room.name).join(', ') : 'N/A'}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Status:</strong> {historyBookingDetails.status}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Payment Status:</strong> {historyBookingDetails.paymentStatus}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Total Price:</strong> ₱{(Number(historyBookingDetails.totalPrice) / 100).toFixed(0)}
              </div>
              {historyBookingDetails.optionalAmenities && Array.isArray(historyBookingDetails.optionalAmenities) && historyBookingDetails.optionalAmenities.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Optional Amenities:</strong>
                  <ul>
                    {historyBookingDetails.optionalAmenities.map((oa, idx) => (
                      <li key={idx}>{oa.optionalAmenity.name} x{oa.quantity}</li>
                    ))}
                  </ul>
                </div>
              )}
              {historyBookingDetails.rentalAmenities && Array.isArray(historyBookingDetails.rentalAmenities) && historyBookingDetails.rentalAmenities.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Rental Amenities:</strong>
                  <ul>
                    {historyBookingDetails.rentalAmenities.map((ra, idx) => (
                      <li key={idx}>{ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed} hours)` : ''} - ₱{(Number(ra.totalPrice) / 100).toFixed(0)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {historyBookingDetails.cottage && Array.isArray(historyBookingDetails.cottage) && historyBookingDetails.cottage.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Cottages:</strong>
                  <ul>
                    {historyBookingDetails.cottage.map((c, idx) => (
                      <li key={idx}>{c.cottage.name} x{c.quantity} - ₱{(Number(c.totalPrice) / 100).toFixed(0)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryBookingDetails(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Booking Modal */}
        {showEditModal && currentBooking && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '1rem',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                setCurrentBooking(null);
              }
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.98)',
                padding: '2rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '1rem'
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#1e293b',
                  fontSize: '1.5rem',
                  fontWeight: '600'
                }}>
                  Edit Booking #{currentBooking.id}
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentBooking(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                <Edit size={48} style={{ marginBottom: '1rem', color: '#3b82f6' }} />
                <p>Edit booking functionality coming soon...</p>
                <p>Guest: {currentBooking.guestName}</p>
                <p>Room: {currentBooking.roomNumber}</p>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginTop: '1.5rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem'
              }}>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentBooking(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* More Actions Modal */}
        {showMoreActionsModal && currentBooking && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '1rem',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowMoreActionsModal(false);
                setCurrentBooking(null);
              }
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.98)',
                padding: '2rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '1rem'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#1e293b',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  More Actions
                </h3>
                <button
                  onClick={() => {
                    setShowMoreActionsModal(false);
                    setCurrentBooking(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0.5rem',
                    borderRadius: '8px'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setShowMoreActionsModal(false);
                    setShowDetailsModal(true);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Eye size={16} />
                  View Full Details
                </button>
                
                <button
                  onClick={() => {
                    setShowMoreActionsModal(false);
                    setShowEditModal(true);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Edit size={16} />
                  Edit Booking
                </button>
                
                <button
                  onClick={() => {
                    setShowMoreActionsModal(false);
                    setShowCancelModal(true);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    color: '#dc2626',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Trash2 size={16} />
                  Cancel Booking
                </button>
                
                <button
                  onClick={() => {
                    const csvData = `Booking ID,Guest Name,Check-in,Check-out,Room,Status,Total,Payment
${currentBooking.id},${currentBooking.guestName},${currentBooking.checkInDate},${currentBooking.checkOutDate},${currentBooking.roomNumber},${currentBooking.status},₱${currentBooking.totalAmount},${currentBooking.paymentOption}`;
                    
                    const blob = new Blob([csvData], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `booking-${currentBooking.id}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    setShowMoreActionsModal(false);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Download size={16} />
                  Export Booking Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Modal */}
        {showBulkActionsModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '1rem',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowBulkActionsModal(false);
              }
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.98)',
                padding: '2rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '1rem'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#1e293b',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  Bulk Actions
                </h3>
                <button
                  onClick={() => setShowBulkActionsModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0.5rem',
                    borderRadius: '8px'
                  }}
                >
                  ×
                </button>
              </div>
              
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                {selectedBookings.length} booking(s) selected
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    if (confirm(`Cancel ${selectedBookings.length} selected booking(s)?`)) {
                      // Bulk cancel logic would go here
                      alert('Bulk cancel functionality coming soon...');
                      setShowBulkActionsModal(false);
                      setSelectedBookings([]);
                    }
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    color: '#dc2626',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Trash2 size={16} />
                  Cancel Selected Bookings
                </button>
                
                <button
                  onClick={() => {
                    const selectedBookingData = filteredBookings.filter(b => selectedBookings.includes(b.id));
                    const csvData = [
                      'Booking ID,Guest Name,Check-in,Check-out,Room,Status,Total,Payment',
                      ...selectedBookingData.map(booking => 
                        `${booking.id},${booking.guestName},${booking.checkInDate},${booking.checkOutDate},${booking.roomNumber},${booking.status},₱${booking.totalAmount},${booking.paymentOption}`
                      )
                    ].join('\n');
                    
                    const blob = new Blob([csvData], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'selected-bookings.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    setShowBulkActionsModal(false);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Download size={16} />
                  Export Selected Bookings
                </button>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginTop: '1.5rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem'
              }}>
                <button
                  onClick={() => setShowBulkActionsModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

const styles = {
  container: {
    padding: '0',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  
  // Header Section
  header: {
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
    color: '#ffffff',
    padding: '2rem 2rem 3rem',
    borderRadius: '0 0 24px 24px',
    marginBottom: '2rem',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  subtitle: {
    fontSize: '1.125rem',
    opacity: 0.9,
    margin: 0,
    fontWeight: '400',
  },
  headerActions: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#ffffff',
    color: '#667eea',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  },
  
  // KPI Section
  kpiSection: {
    maxWidth: '1400px',
    margin: '0 auto 2rem',
    padding: '0 2rem',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  kpiContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  kpiIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    backgroundColor: '#e0f2fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0284c7',
  },
  kpiInfo: {
    flex: 1,
  },
  kpiValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.25rem 0',
  },
  kpiLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    fontWeight: '500',
  },
  kpiTrend: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  
  // Filters Section
  filtersCard: {
    maxWidth: '1400px',
    margin: '0 auto 2rem',
    padding: '0 2rem',
  },
  filtersHeader: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    flex: '1 1 300px',
    minWidth: '250px',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 3rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
    outline: 'none',
    '&:focus': {
      borderColor: '#3b82f6',
      backgroundColor: '#ffffff',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    },
  },
  quickFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  quickFilterSelect: {
    padding: '0.75rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    minWidth: '140px',
    '&:hover': {
      borderColor: '#cbd5e1',
      backgroundColor: '#f8fafc',
    },
    '&:focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    },
  },
  addBookingButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    '&:hover': {
      backgroundColor: '#059669',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)',
    },
  },
  filterActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    padding: '4px',
  },
  viewToggleButton: {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filtersContent: {
    backgroundColor: '#ffffff',
    borderRadius: '0 0 16px 16px',
    padding: '1.5rem',
    marginTop: '-1px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    borderTop: 'none',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  filterLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  filterSelect: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    minWidth: '140px',
  },
  dateRangeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dateInput: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
  },
  dateSeparator: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500',
  },
  clearFiltersButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f3f4f6',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  // Message Card
  messageCard: {
    maxWidth: '1400px',
    margin: '0 auto 1.5rem',
    padding: '0 2rem',
  },
  messageContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.5rem',
    borderRadius: '12px',
    border: '2px solid',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  messageIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    flex: 1,
    fontSize: '1rem',
    fontWeight: '500',
  },
  messageClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  // Tabs
  tabsCard: {
    maxWidth: '1400px',
    margin: '0 auto 2rem',
    padding: '0 2rem',
  },
  tabsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabsList: {
    display: 'flex',
    gap: '0.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '0.5rem',
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
    color: '#64748b',
  },
  tabButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'inherit',
    borderRadius: '12px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    minWidth: '20px',
    textAlign: 'center',
  },
  tabsStats: {
    display: 'flex',
    gap: '2rem',
  },
  quickStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  
  // Modern Table Styles
  bookingsCard: {
    maxWidth: '1400px',
    margin: '0 auto 2rem',
    padding: '0 2rem',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
  },
  tableTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  tableActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  bulkActionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  modernTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHead: {
    backgroundColor: '#f8fafc',
  },
  tableHeadCell: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tableHeadContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  headerCheckbox: {
    margin: 0,
  },
  tableBody: {
    backgroundColor: '#ffffff',
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  tableCell: {
    padding: '1rem',
    verticalAlign: 'top',
  },
  guestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  rowCheckbox: {
    margin: 0,
  },
  guestAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    fontWeight: '600',
  },
  guestDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  guestName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e293b',
  },
  bookingId: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  dateInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  checkInDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#059669',
  },
  checkOutDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#dc2626',
  },
  duration: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  roomInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  roomName: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  guestCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  paymentStatus: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  paymentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  paidAmount: {
    fontSize: '0.875rem',
    color: '#059669',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: '0.875rem',
    color: '#dc2626',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  actionButtonDanger: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b',
  },
  
  // Cards View Styles
  cardsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  emptyCards: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b',
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'all 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  cardGuestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  cardAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: '600',
  },
  cardGuestName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  cardBookingId: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
  },
  cardStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.875rem',
  },
  cardIcon: {
    color: '#64748b',
    flexShrink: 0,
  },
  cardActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  cardActionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cardActionButtonDanger: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  // Pagination Styles
  paginationContainer: {
    maxWidth: '1400px',
    margin: '2rem auto 0',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paginationInfo: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  paginationControls: {
    display: 'flex',
    gap: '0.5rem',
  },
  paginationButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
  },
  paginationButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
  },
  
  // Bulk Actions Styles
  bulkActionsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginRight: '1rem',
    padding: '0.5rem',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  selectedCount: {
    fontSize: '0.875rem',
    color: '#475569',
    fontWeight: '500',
    marginRight: '0.5rem',
  },
  bulkActionButtonSecondary: {
    padding: '0.5rem 0.75rem',
    background: '#ffffff',
    color: '#475569',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  exportButton: {
    padding: '0.75rem 1rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginRight: '0.5rem',
  },
  headerCheckbox: {
    marginRight: '0.5rem',
    cursor: 'pointer',
    transform: 'scale(1.1)',
  },
  rowCheckbox: {
    marginRight: '0.75rem',
    cursor: 'pointer',
    transform: 'scale(1.1)',
  },
};

// Helper functions for status styling and icons
function getStatusStyle(status) {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return { backgroundColor: '#dcfce7', color: '#166534' };
    case 'pending':
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case 'cancelled':
      return { backgroundColor: '#fee2e2', color: '#991b1b' };
    case 'completed':
      return { backgroundColor: '#dbeafe', color: '#1e40af' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#374151' };
  }
}

function getStatusIcon(status) {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return <CheckCircle size={14} />;
    case 'pending':
      return <Clock size={14} />;
    case 'cancelled':
      return <XCircle size={14} />;
    case 'completed':
      return <Star size={14} />;
    default:
      return <Circle size={14} />;
  }
}
