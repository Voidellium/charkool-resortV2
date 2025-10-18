'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useChangeModal, ChangeModal, useReceiptModal, ReceiptModal } from '@/components/CustomModals';

export default function CashierDashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // This will redirect to the login page.
    }
  });

  const [amountPaid, setAmountPaid] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [amountCustomerPaid, setAmountCustomerPaid] = useState(''); // New field
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [datePaid, setDatePaid] = useState('');
  const [bookingType, setBookingType] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  
  // Enhanced cashier features
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [activeTab, setActiveTab] = useState('Unverified');
  const [noteText, setNoteText] = useState('');
  const [notifCount, setNotifCount] = useState(0);
  
  // Missing state variables
  const [bookings, setBookings] = useState([]);
  const [paidPayments, setPaidPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  
  // Modal hooks
  const [changeModal, setChangeModal] = useChangeModal();
  const [receiptModal, setReceiptModal] = useReceiptModal();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBookings();
      fetchPaidPayments();
      fetchCashierNotifications();
      fetchUpcomingReservations();
    }
  }, [status]);

  async function fetchCashierNotifications() {
    try {
      const res = await fetch('/api/notifications?role=CASHIER');
      if (!res.ok) return;
      const arr = await res.json();
      if (Array.isArray(arr)) setNotifCount(arr.filter(n => !n.isRead).length);
    } catch (_) {}
  }

  async function fetchUpcomingReservations() {
    try {
      const res = await fetch('/api/cashier/upcoming-reservations');
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Failed to fetch upcoming reservations:', res.status, errorData);
        setUpcomingReservations([]);
        return;
      }
      const data = await res.json();
      console.log('Upcoming reservations data:', data);
      setUpcomingReservations(data.reservations || []);
    } catch (err) {
      console.error('Error fetching upcoming reservations:', err);
      setUpcomingReservations([]);
    }
  }

  // Helper function to determine if a booking should be displayed in unpaid transactions
  function shouldShowInUnpaidTransactions(booking) {
    // Check if booking meets any of the criteria for unpaid transactions:

    // 1. Any booking that currently has a status of 'pending'
    if (booking.status === 'pending') {
      return true;
    }

    // 2. Online bookings from the website where the guest selected "Reservation Payment"
    // (implying they will pay in full at the counter)
    if (booking.paymentMethod === 'Reservation Payment' && booking.paymentStatus !== 'paid') {
      return true;
    }

    // 3. Online bookings from the website where the guest selected the "Half Booking Method"
    // and still has a remaining balance
    if (booking.paymentMethod === 'Half Booking Method') {
      const totalPaid = booking.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const remainingBalance = booking.totalPrice - totalPaid;
      if (remainingBalance > 0) {
        return true;
      }
    }

    // 4. Any pending payments for bookings created by a receptionist
    // (e.g., walk-ins or phone reservations)
    if (booking.createdBy === 'receptionist' || booking.bookingType === 'Walk-in' || booking.bookingType === 'Phone') {
      const totalPaid = booking.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      if (totalPaid < booking.totalPrice) {
        return true;
      }
    }

    return false;
  }

  async function fetchBookings() {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      const data = await res.json();

      // Check if response is successful
      if (!res.ok) {
        console.error('Failed to fetch bookings:', data);
        setBookings([]);
        return;
      }

      // Handle paginated response format: { bookings: [...], pagination: {...} }
      let bookingsArray = [];
      if (data && Array.isArray(data.bookings)) {
        bookingsArray = data.bookings;
      } else if (Array.isArray(data)) {
        // Fallback for direct array response
        bookingsArray = data;
      } else {
        console.error('Unexpected response format:', typeof data, data);
        setBookings([]);
        return;
      }

      // Apply the new filtering logic for unpaid transactions
      const filtered = bookingsArray.filter(booking => shouldShowInUnpaidTransactions(booking));

      setBookings(filtered || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setBookings([]);
      setLoading(false);
    }
  }

  async function fetchPaidPayments() {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/today');
      const data = await res.json();
      
      // Check if response is successful
      if (!res.ok) {
        console.error('Failed to fetch paid payments:', data);
        setPaidPayments([]);
        setLoading(false);
        return;
      }

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', typeof data, data);
        setPaidPayments([]);
        setLoading(false);
        return;
      }

      setPaidPayments(data);
    } catch (err) {
      console.error('Error fetching paid payments:', err);
      setPaidPayments([]);
    } finally {
      setLoading(false);
    }
  }

  async function verifySelectedPayment() {
    if (!selectedPayment) return;
    try {
      const res = await fetch('/api/cashier/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: selectedPayment.id, note: noteText || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify');
      await fetchPaidPayments();
      await fetchUpcomingReservations();
      setNoteText('');
      alert('Payment verified.');
    } catch (e) { alert(e.message); }
  }

  async function flagSelectedPayment() {
    if (!selectedPayment) return;
    const reason = prompt('Enter reason for flagging:', 'Reference mismatch');
    if (!reason) return;
    try {
      const res = await fetch('/api/cashier/flag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: selectedPayment.id, reason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to flag');
      await fetchPaidPayments();
      await fetchUpcomingReservations();
      alert('Payment flagged.');
    } catch (e) { alert(e.message); }
  }

  async function addNoteForSelected() {
    if (!selectedPayment || !noteText.trim()) return;
    try {
      const bid = selectedPayment.booking?.id || selectedPayment.bookingId || selectedPayment.id;
      const res = await fetch(`/api/bookings/${bid}/remarks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: noteText }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add note');
      setNoteText('');
      alert('Note added.');
    } catch (e) { alert(e.message); }
  }

  async function confirmFullPaymentOnsite() {
    if (!selectedPayment) return;
    try {
      const bid = selectedPayment.booking?.id || selectedPayment.bookingId || selectedPayment.id;
      const amountInCents = Math.round((parseFloat(amountCustomerPaid) || 0) * 100);
      const res = await fetch('/api/cashier/confirm-full', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: bid, amountPaid: amountInCents, method: paymentMethod || 'cash', referenceNo }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm full payment');
      await fetchPaidPayments();
      await fetchUpcomingReservations();
      alert('Full payment recorded.');
    } catch (e) { alert(e.message); }
  }

  

  function selectPayment(payment) {
    setSelectedPayment(payment);
    setAmountPaid(payment.amount ? (payment.amount / 100).toFixed(0) : '');
    setPaymentStatus(payment.status);
    setAmountTendered(payment.amount ? (payment.amount / 100).toFixed(0) : '');
    setAmountCustomerPaid(''); // Reset new field
    setPaymentMethod('');
    setReferenceNo(payment.id || '');
    setName(payment.booking?.user?.name || payment.user?.name || '');
    setEmail(payment.booking?.user?.email || payment.user?.email || '');
    setContact(payment.booking?.user?.contact || payment.user?.contact || '');
    setDatePaid(payment.createdAt ? new Date(payment.createdAt).toISOString().split('T')[0] : '');
    setBookingType(payment.booking?.type || 'Walk-in');
    setCheckIn(payment.booking?.checkIn ? new Date(payment.booking.checkIn).toISOString().split('T')[0] : '');
    setCheckOut(payment.booking?.checkOut ? new Date(payment.booking.checkOut).toISOString().split('T')[0] : '');
  }

  async function updatePaymentStatus() {
    if (!selectedPayment) return;

    const amountInCents = Math.round(parseFloat(amountTendered) * 100);
    const customerPaidInCents = Math.round(parseFloat(amountCustomerPaid) * 100);
    const requiredAmount = selectedPayment.amount || selectedPayment.totalPrice;

    const calculatedChange = Math.max(0, customerPaidInCents - requiredAmount);

    let newStatus = 'Pending';
    if (customerPaidInCents >= requiredAmount) {
      newStatus = 'Paid';
    }

    try {
      const res = await fetch('/api/payments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          amount: amountInCents,
          customerPaid: customerPaidInCents,
          status: newStatus,
          paymentMethod: paymentMethod,
          referenceNo: referenceNo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        playSuccessSound();

        const receiptData = {
          receiptNo: `RCP-${Date.now()}`,
          guestName: name,
          bookingId: selectedPayment.booking?.id || selectedPayment.id,
          amount: customerPaidInCents / 100,
          paymentMethod: paymentMethod,
          change: calculatedChange / 100,
          cashier: session?.user?.name,
          timestamp: new Date(),
          items: [
            {
              description: `Booking Payment - ${bookingType}`,
              amount: requiredAmount / 100,
            },
          ],
        };

        if (calculatedChange > 0) {
          setChangeModal({
            show: true,
            amount: calculatedChange,
            onClose: () => {
              setReceiptModal({ show: true, receiptData });
            },
          });
        } else {
          setReceiptModal({ show: true, receiptData });
        }

        fetchBookings();
        fetchPaidPayments();
        setSelectedPayment(null);
        resetForm();
      } else {
        alert('Failed to update payment: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Update payment error:', error);
      alert('Error updating payment');
    }
  }

  // Sound notification for successful payment
  function playSuccessSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjiR2e7NeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsbCjib==');
    audio.play().catch(() => {}); // Ignore audio errors
  }

  // Confirm booking function for cashier
  async function confirmBooking() {
    if (!selectedPayment) return;

    const bookingId = selectedPayment.booking?.id || selectedPayment.id;
    
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Confirmed',
          confirmedBy: 'cashier',
          confirmedAt: new Date().toISOString()
        }),
      });
      
      if (res.ok) {
        alert('Booking confirmed successfully!');
        fetchBookings();
        fetchPaidPayments();
      } else {
        const data = await res.json();
        alert('Failed to confirm booking: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Confirm booking error:', error);
      alert('Error confirming booking');
    }
  }



  function resetForm() {
    setAmountPaid('');
    setPaymentStatus('');
    setAmountTendered('');
    setAmountCustomerPaid('');
    setPaymentMethod('');
    setReferenceNo('');
    setName('');
    setEmail('');
    setContact('');
    setDatePaid('');
    setBookingType('');
    setCheckIn('');
    setCheckOut('');
  }

  // Filter bookings based on search and filters
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchQuery || 
      booking.guestName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.id.toString().includes(searchQuery) ||
      booking.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = !filterStatus || booking.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesPaymentMethod = !filterPaymentMethod || booking.paymentMethod === filterPaymentMethod;
    
    return matchesSearch && matchesStatus && matchesPaymentMethod;
  });
  // Filter paid payments based on search
  const filteredPaidPayments = paidPayments.filter(payment => {
    const matchesSearch = !searchQuery || 
      payment.booking?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.id.toString().includes(searchQuery) ||
      payment.booking?.guestName?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  // Tab categories for today payments
  const unverified = filteredPaidPayments.filter(p => p.verificationStatus === 'Unverified');
  const verified = filteredPaidPayments.filter(p => p.verificationStatus === 'Verified');
  const flagged = filteredPaidPayments.filter(p => p.verificationStatus === 'Flagged');
  const paidTab = filteredPaidPayments.filter(p => p.status === 'Paid');
  const cancelled = filteredPaidPayments.filter(p => p.booking?.status === 'Cancelled');

  const totalTransactions = filteredBookings.length + filteredPaidPayments.length;
  const pendingTransactions = filteredBookings.length;

  // Calculate remaining balance to pay from all unpaid transactions
  const remainingBalance = filteredBookings.reduce((total, booking) => {
    const totalPaid = booking.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const remaining = booking.totalPrice - totalPaid;
    return total + Math.max(0, remaining); // Only add positive remaining balances
  }, 0);

  // Daily totals for KPI
  const dailyTotal = filteredPaidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cashTotal = filteredPaidPayments
    .filter(p => (p.method || '').toLowerCase() === 'cash')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cardTotal = filteredPaidPayments
    .filter(p => (p.method || '').toLowerCase() === 'card')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  // Show a loading state while the session is being fetched or data is loading.
  if (status === 'loading' || loading) {
    return <p>Loading cashier dashboard...</p>;
  }

  const isPaid = selectedPayment?.status === 'Paid';
  const requiredAmount = selectedPayment?.amount || 0;
  const customerPaidAmount = parseFloat(amountCustomerPaid) || 0;
  const isExactPayment = Math.abs(customerPaidAmount * 100 - requiredAmount) < 1; // Allow for small rounding differences

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      fontFamily: 'Arial, sans-serif', 
      backgroundColor: '#f4f4f9' 
    }}>
      {/* Account + Notifications at the top */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f0f0f0',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          marginBottom: '1rem',
        }}
      >
        <span>Account: {session?.user?.name}</span>
        <span style={{ marginLeft: '1rem', fontWeight: 500 }}>
          Notifications: <span style={{ background: '#ff5252', color: '#fff', padding: '2px 8px', borderRadius: '12px' }}>{notifCount}</span>
        </span>
      </div>

      {/* Main content area */}
      <div style={{ 
        display: 'flex', 
        flex: 1,
        gap: '2rem', 
        padding: '0 1rem 1rem 1rem' 
      }}>
        {/* Left: KPI and tables */}
        <div style={{ 
          flex: '1 1 60%', 
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            marginBottom: '1rem', 
            color: '#4b4b7a' 
          }}>
            Cashier Dashboard
          </h2>
          
          {/* Enhanced Search and Filter Bar */}
          <div style={{
            backgroundColor: '#fff',
            padding: '1rem',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search by guest name, booking ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '5px',
                border: '1px solid #ddd',
                fontSize: '0.9rem',
                minWidth: '120px'
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '5px',
                border: '1px solid #ddd',
                fontSize: '0.9rem',
                minWidth: '120px'
              }}
            >
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Online">Online</option>
              <option value="Reservation Payment">Reservation</option>
            </select>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('');
                setFilterPaymentMethod('');
              }}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Clear Filters
            </button>
          </div>
          
          {/* Enhanced KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              backgroundColor: '#7c6fdd',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(124, 111, 221, 0.4)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.9rem' }}>Total Transactions Today</h3>
              <p style={{ fontSize: '2rem', margin: 0, fontWeight: '700' }}>{totalTransactions}</p>
            </div>
            <div style={{
              backgroundColor: '#ff9800',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(255, 152, 0, 0.4)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.9rem' }}>Pending Transactions</h3>
              <p style={{ fontSize: '2rem', margin: 0, fontWeight: '700' }}>{pendingTransactions}</p>
            </div>
            <div style={{
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(76, 175, 80, 0.4)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.9rem' }}>Daily Sales</h3>
              <p style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700' }}>₱{(dailyTotal / 100).toLocaleString()}</p>
            </div>
            <div style={{
              backgroundColor: '#ff6b6b',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(255, 107, 107, 0.4)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.9rem' }}>Outstanding Balance</h3>
              <p style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700' }}>₱{(remainingBalance / 100).toLocaleString()}</p>
            </div>
            <div style={{
              backgroundColor: '#2196f3',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(33, 150, 243, 0.4)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.9rem' }}>Cash Sales</h3>
              <p style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700' }}>₱{(cashTotal / 100).toLocaleString()}</p>
            </div>
            <div style={{
              backgroundColor: '#9c27b0',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(156, 39, 176, 0.4)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.9rem' }}>Card Sales</h3>
              <p style={{ fontSize: '1.5rem', margin: 0, fontWeight: '700' }}>₱{(cardTotal / 100).toLocaleString()}</p>
            </div>
          </div>

          {/* Today Payments Tabs */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Unverified','Verified','Flagged','Paid','Cancelled'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 12px', borderRadius: 6, border: activeTab===tab? '2px solid #4b4b7a':'1px solid #ccc', background: activeTab===tab?'#e8e8ff':'#fff', cursor:'pointer' }}>{tab}</button>
            ))}
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Today Payments — {activeTab}</h3>
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left' }}>Payment ID</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left' }}>Guest</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left' }}>Amount</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left' }}>Method</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left' }}>Status</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left' }}>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab==='Unverified'?unverified:activeTab==='Verified'?verified:activeTab==='Flagged'?flagged:activeTab==='Paid'?paidTab:cancelled).map((p) => (
                    <tr key={p.id} onClick={() => selectPayment(p)} style={{ cursor:'pointer', backgroundColor: selectedPayment?.id===p.id?'#e3f2fd':'#fff' }}>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{p.id}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{p.booking?.user?.name || p.booking?.guestName || 'N/A'}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>₱{(Number(p.amount)/100).toLocaleString()}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{p.method || p.provider}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{p.status}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{p.verificationStatus}</td>
                    </tr>
                  ))}
                  {((activeTab==='Unverified'?unverified:activeTab==='Verified'?verified:activeTab==='Flagged'?flagged:activeTab==='Paid'?paidTab:cancelled).length===0) && (
                    <tr><td colSpan={6} style={{ padding:'1rem', textAlign:'center', color:'#666' }}>No records</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Reservations (Read-Only) */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#666' }}>
              📅 Upcoming Reservations ({upcomingReservations.length})
            </h3>
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '10px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '2px solid #e3f2fd',
              overflow: 'hidden'
            }}>
              {upcomingReservations.length === 0 ? (
                <div style={{ 
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  No upcoming reservations found.
                  <br />
                  <small>Bookings with reservation payments and future check-in dates will appear here.</small>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e3f2fd' }}>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Guest Name</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Check-in Date</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Total Amount</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Amount Paid</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Remaining Balance</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Days Until Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingReservations.map((reservation) => {
                      const checkInDate = new Date(reservation.checkInDate);
                      const formattedDate = checkInDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                      
                      return (
                        <tr key={reservation.id} style={{ backgroundColor: '#f8f9fa' }}>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                            {reservation.guestName}
                          </td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                            {formattedDate}
                          </td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                            ₱{(reservation.totalAmount / 100).toLocaleString()}
                          </td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px 8px', color: '#059669', fontWeight: '600' }}>
                            ₱{(reservation.totalPaid / 100).toLocaleString()}
                          </td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px 8px', color: '#dc2626', fontWeight: '600' }}>
                            ₱{(reservation.remainingBalance / 100).toLocaleString()}
                          </td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                            <span style={{ 
                              backgroundColor: reservation.daysUntilCheckIn <= 7 ? '#fef3c7' : '#e3f2fd',
                              color: reservation.daysUntilCheckIn <= 7 ? '#92400e' : '#1565c0',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}>
                              {reservation.daysUntilCheckIn} day{reservation.daysUntilCheckIn !== 1 ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div style={{ 
                padding: '0.75rem 1rem', 
                backgroundColor: '#e3f2fd', 
                borderTop: '1px solid #dee2e6',
                fontSize: '0.875rem',
                color: '#666',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                📖 Read-only section - No actions can be performed on upcoming reservations
              </div>
            </div>
          </div>

          {/* Unpaid Transactions Table */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Unpaid Transactions</h3>
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '10px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>OR #</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Guest</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Total Amount</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Remaining Balance</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((payment) => (
                    <tr
                      key={payment.id}
                      onClick={() => selectPayment(payment)}
                      style={{ 
                        backgroundColor: selectedPayment?.id === payment.id ? '#e3f2fd' : payment.status === 'pending' ? '#fff3cd' : '#f8f9fa',
                        cursor: 'pointer',
                        borderBottom: '1px solid #dee2e6'
                      }}
                    >
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{payment.id}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{payment.booking?.user?.name || payment.user?.name || payment.guestName || 'N/A'}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: payment.status === 'pending' ? '#ffc107' : payment.status === 'confirmed' ? '#28a745' : '#6c757d',
                          color: payment.status === 'pending' ? '#212529' : '#fff'
                        }}>
                          {payment.status}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>₱{(payment.totalPrice / 100).toLocaleString()}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                        <span style={{
                          color: '#dc3545',
                          fontWeight: '600'
                        }}>
                          ₱{((payment.totalPrice - (payment.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)) / 100).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                        {searchQuery || filterStatus || filterPaymentMethod ? 'No transactions match your filters' : 'No unpaid transactions'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paid Transactions Table */}
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Paid Transactions</h3>
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '10px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>OR #</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Guest</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Amount</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaidPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      onClick={() => selectPayment(payment)}
                      style={{ 
                        backgroundColor: selectedPayment?.id === payment.id ? '#e8f5e8' : '#d4edda',
                        cursor: 'pointer',
                        borderBottom: '1px solid #dee2e6'
                      }}
                    >
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{payment.id}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{payment.booking?.user?.name || payment.user?.name || payment.booking?.guestName || 'N/A'}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: '#28a745',
                          color: '#fff'
                        }}>
                          {payment.status}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>₱{(payment.amount / 100).toLocaleString()}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {filteredPaidPayments.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                        {searchQuery ? 'No paid transactions match your search' : 'No paid transactions today'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Form of Payment */}
        <div style={{ 
          flex: '1 1 40%', 
          background: '#fff', 
          padding: '2rem', 
          borderRadius: '10px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          height: 'fit-content'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            marginBottom: '1.5rem', 
            color: '#4b4b7a' 
          }}>
            Form of Payment
          </h2>
          
          {/* Payment amount section with visual indicators */}
          <div style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: !isExactPayment && amountCustomerPaid ? '2px solid #dc3545' : '2px solid transparent'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <strong>Required Amount:</strong>
              <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                ₱{requiredAmount ? (requiredAmount / 100).toFixed(0) : '0'}
              </span>
            </div>
            
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              <strong>Amount Tendered:</strong>
            </label>
            <input
              type="text"
              value={amountTendered}
              onChange={(e) => setAmountTendered(e.target.value)}
              placeholder="Type here the amount .00"
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                marginBottom: '1rem',
                fontSize: '1rem'
              }}
              disabled={Boolean(isPaid)}
            />

            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              <strong>Amount Customer Paid:</strong>
            </label>
            <input
              type="text"
              value={amountCustomerPaid}
              onChange={(e) => setAmountCustomerPaid(e.target.value)}
              placeholder="Type here what customer paid .00"
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: !isExactPayment && amountCustomerPaid ? '2px solid #dc3545' : '1px solid #ccc',
                fontSize: '1rem'
              }}
              disabled={Boolean(isPaid)}
            />
            
            {!isExactPayment && amountCustomerPaid && (
              <div style={{ 
                color: '#dc3545', 
                fontSize: '0.875rem', 
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>⚠️</span>
                <span>
                  {customerPaidAmount * 100 < requiredAmount
                    ? `Underpaid by ₱${((requiredAmount - customerPaidAmount * 100) / 100).toFixed(0)}`
                    : `Overpaid by ₱${((customerPaidAmount * 100 - requiredAmount) / 100).toFixed(0)}`
                  }
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label><strong>Payment Method:</strong></label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              disabled={Boolean(isPaid)}
            >
              <option value="">Select Method</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>

            <label><strong>Reference No.:</strong></label>
            <input 
              type="text" 
              value={referenceNo} 
              readOnly 
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: '#f8f9fa',
                fontSize: '1rem'
              }} 
            />

            <label><strong>Name:</strong></label>
            <input 
              type="text" 
              value={name} 
              readOnly 
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: '#f8f9fa',
                fontSize: '1rem'
              }} 
            />

            <label><strong>Email:</strong></label>
            <input 
              type="email" 
              value={email} 
              readOnly 
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: '#f8f9fa',
                fontSize: '1rem'
              }} 
            />

            <label><strong>Contact No.:</strong></label>
            <input 
              type="text" 
              value={contact} 
              readOnly 
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: '#f8f9fa',
                fontSize: '1rem'
              }} 
            />

            <label><strong>Date Paid:</strong></label>
            <input
              type="date"
              value={datePaid}
              onChange={(e) => setDatePaid(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              disabled={Boolean(isPaid)}
            />

            <label><strong>Booking Type:</strong></label>
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              disabled={Boolean(isPaid)}
            >
              <option value="Walk-in">Walk-in</option>
              <option value="Reservation">Reservation</option>
            </select>

            <label><strong>Date of Check-in:</strong></label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              disabled={Boolean(isPaid)}
            />

            <label><strong>Date of Check-out:</strong></label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              disabled={Boolean(isPaid)}
            />

            {/* Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '1.5rem',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              {/* Payment Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={verifySelectedPayment} style={{ backgroundColor: '#059669', color: 'white', padding: '0.6rem 0.9rem', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Verify</button>
                <button onClick={flagSelectedPayment} style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.6rem 0.9rem', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Flag</button>
                <button onClick={confirmFullPaymentOnsite} style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.6rem 0.9rem', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Confirm Full Payment</button>
                <button onClick={addNoteForSelected} style={{ backgroundColor: '#6b7280', color: 'white', padding: '0.6rem 0.9rem', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Add Note</button>
                <button
                  style={{ 
                    backgroundColor: isExactPayment ? 'green' : '#6c757d', 
                    color: 'white', 
                    padding: '0.75rem 2rem', 
                    borderRadius: '5px', 
                    border: 'none', 
                    cursor: isPaid ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                  onClick={updatePaymentStatus}
                  disabled={Boolean(isPaid)}
                >
                  {isExactPayment ? 'Confirm Payment' : 'Confirm (Amount Mismatch)'}
                </button>
                <button
                  style={{ 
                    backgroundColor: 'gray', 
                    color: 'white', 
                    padding: '0.75rem 2rem', 
                    borderRadius: '5px', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                  onClick={() => { setSelectedPayment(null); resetForm(); }}
                >
                  Cancel
                </button>
              </div>

              {/* Internal Note */}
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Internal Note</label>
                <textarea value={noteText} onChange={(e)=>setNoteText(e.target.value)} placeholder="e.g., Downpayment verified at 12:45 PM" style={{ width:'100%', minHeight: 70, padding: 10, border:'1px solid #ddd', borderRadius:6 }} />
              </div>
              
              {/* Booking Confirmation Button - only show for pending bookings */}
              {selectedPayment && (selectedPayment.status === 'pending' || selectedPayment.status === 'Pending') && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    style={{ 
                      backgroundColor: '#2196f3', 
                      color: 'white', 
                      padding: '0.75rem 2rem', 
                      borderRadius: '5px', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      width: '100%'
                    }}
                    onClick={confirmBooking}
                  >
                    ✓ Confirm Booking (Cashier Authority)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cashier Modals */}
      <ChangeModal 
        modal={changeModal} 
        setModal={setChangeModal}
        onClose={changeModal.onClose}
      />
      <ReceiptModal 
        modal={receiptModal} 
        setModal={setReceiptModal}
      />
    </div>
  );
}
