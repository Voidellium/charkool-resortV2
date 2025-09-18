'use client';
import { useEffect, useState } from 'react';

export default function CashierDashboard() {
  const [bookings, setBookings] = useState([]);
  const [paidPayments, setPaidPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [datePaid, setDatePaid] = useState('');
  const [bookingType, setBookingType] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  useEffect(() => {
    fetchBookings();
    fetchPaidPayments();
  }, []);

  async function fetchBookings() {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      const today = new Date().toISOString().split('T')[0];
      const filtered = data.filter(booking => {
        const bookingDate = booking.checkIn ? booking.checkIn.split('T')[0] : null;
        return bookingDate === today;
      });
      setBookings(filtered || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  }

  async function fetchPaidPayments() {
    try {
      const res = await fetch('/api/payments/today');
      const data = await res.json();
      setPaidPayments(data || []);
    } catch (err) {
      console.error('Error fetching paid payments:', err);
    } finally {
      setLoading(false);
    }
  }

  function selectPayment(payment) {
    setSelectedPayment(payment);
    setAmountPaid(payment.amount ? (payment.amount / 100).toFixed(2) : '');
    setPaymentStatus(payment.status);
    setAmountTendered(payment.amount ? (payment.amount / 100).toFixed(2) : '');
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
    const newStatus = amountInCents >= selectedPayment.amount ? 'paid' : 'pending';

    try {
      const res = await fetch('/api/payments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          amount: amountInCents,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Payment updated successfully');
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

  function resetForm() {
    setAmountPaid('');
    setPaymentStatus('');
    setAmountTendered('');
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

  const totalTransactions = bookings.length + paidPayments.length;
  const pendingTransactions = bookings.length;

  if (loading) return <p>Loading cashier dashboard...</p>;

  const isPaid = selectedPayment?.status === 'paid';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      {/* Left side: KPI cards and transaction tables */}
      <div style={{ flex: '1 1 350px', maxWidth: '600px', minWidth: '300px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Cashier Dashboard</h2>
        <div>
          <div style={{ backgroundColor: '#7c6fdd', color: 'white', padding: '1rem', borderRadius: '10px', marginBottom: '0.75rem', boxShadow: '0 2px 6px rgba(124, 111, 221, 0.4)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Total Transactions Today</h3>
            <p style={{ fontSize: '2.5rem', textAlign: 'center', fontWeight: '700' }}>{totalTransactions}</p>
          </div>
          <div style={{ backgroundColor: '#7c6fdd', color: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 6px rgba(124, 111, 221, 0.4)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Pending Transaction</h3>
            <p style={{ fontSize: '2.5rem', textAlign: 'center', fontWeight: '700' }}>{pendingTransactions}</p>
          </div>
        </div>

        {/* Unpaid Transactions Table */}
        <h3>Unpaid Transactions</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#ddd' }}>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>OR #</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Guest</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Status</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Amount</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((payment) => (
              <tr
                key={payment.id}
                onClick={() => selectPayment(payment)}
                style={{ backgroundColor: '#f9a0a0', cursor: 'pointer' }}
              >
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.id}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.booking?.user?.name || payment.user?.name || 'N/A'}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.status}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  ₱{payment.amount ? (payment.amount / 100).toFixed(2) : '0.00'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paid Transactions Table */}
        <h3>Paid Transactions</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#ddd' }}>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>OR #</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Guest</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Status</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Amount</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {paidPayments.map((payment) => (
              <tr
                key={payment.id}
                onClick={() => selectPayment(payment)}
                style={{ backgroundColor: '#f9c2b0', cursor: 'pointer' }}
              >
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.id}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.booking?.user?.name || payment.user?.name || 'N/A'}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.status}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                  ₱{payment.amount ? (payment.amount / 100).toFixed(2) : '0.00'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right side: Form of Payment */}
      <div style={{ flex: '1 1 300px', minWidth: '280px', background: '#fff', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#4b4b7a' }}>Form of Payment</h2>
        <p><strong>Amount Tendered:</strong> ₱ <input type="text" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} placeholder="Type here the amount .00" style={{ width: '100%' }} disabled={isPaid} /></p>
        <p><strong>Payment Method:</strong>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%' }} disabled={isPaid}>
            <option value="">Select Method</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Online">Online</option>
          </select>
        </p>
        <p><strong>Reference No.:</strong> <input type="text" value={referenceNo} readOnly style={{ width: '100%' }} /></p>
        <p><strong>Name:</strong> <input type="text" value={name} readOnly style={{ width: '100%' }} /></p>
        <p><strong>Email:</strong> <input type="email" value={email} readOnly style={{ width: '100%' }} /></p>
        <p><strong>Contact No.:</strong> <input type="text" value={contact} readOnly style={{ width: '100%' }} /></p>
        <p><strong>Date paid:</strong> <input type="date" value={datePaid} onChange={(e) => setDatePaid(e.target.value)} style={{ width: '100%' }} disabled={isPaid} /></p>
        <p><strong>Booking Type:</strong>
          <select value={bookingType} onChange={(e) => setBookingType(e.target.value)} style={{ width: '100%' }} disabled={isPaid}>
            <option value="Walk-in">Walk-in</option>
            <option value="Reservation">Reservation</option>
          </select>
        </p>
        <p><strong>Date of Check in:</strong> <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} style={{ width: '100%' }} disabled={isPaid} /></p>
        <p><strong>Date of Check out:</strong> <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} style={{ width: '100%' }} disabled={isPaid} /></p>
        <button style={{ backgroundColor: 'green', color: 'white', padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer', marginRight: '1rem' }} onClick={updatePaymentStatus} disabled={isPaid}>Confirm</button>
        <button style={{ backgroundColor: 'gray', color: 'white', padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer' }} onClick={() => { setSelectedPayment(null); resetForm(); }}>Cancel</button>
      </div>
    </div>
  );
}
