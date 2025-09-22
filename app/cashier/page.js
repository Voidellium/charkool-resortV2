'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function CashierDashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // This will redirect to the login page.
    },
  });
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
    if (status === 'authenticated') {
      fetchBookings();
      fetchPaidPayments();
    }
  }, [status]);

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

  // Show a loading state while the session is being fetched or data is loading.
  if (status === 'loading' || loading) {
    return <p>Loading cashier dashboard...</p>;
  }

  const isPaid = selectedPayment?.status === 'paid';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', padding: '1rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f9' }}>
      {/* Account Name at the top */}
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
        Account: {session?.user?.name}
      </div>

      {/* Left: KPI and tables */}
      <div style={{ flex: '1 1 350px', maxWidth: '600px', minWidth: '300px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#4b4b7a' }}>Cashier Dashboard</h2>
        {/* KPI Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: '#7c6fdd', color: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 6px rgba(124, 111, 221, 0.4)', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Total Transactions Today</h3>
            <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: '700' }}>{totalTransactions}</p>
         </div>
          <div style={{ backgroundColor: '#7c6fdd', color: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 6px rgba(124, 111, 221, 0.4)', textAlign: 'center' }}>
           <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Pending Transaction</h3>
           <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: '700' }}>{pendingTransactions}</p>
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
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>₱{(payment.amount / 100).toFixed(2)}</td>
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
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>₱{(payment.amount / 100).toFixed(2)}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form of Payment */}
      <div style={{ flex: '1 1 300px', minWidth: '280px', background: '#fff', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#4b4b7a' }}>Form of Payment</h2>
        {/* Using similar styled inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label><strong>Amount Tendered:</strong></label>
          <input
            type="text"
            value={amountTendered}
            onChange={(e) => setAmountTendered(e.target.value)}
            placeholder="Type here the amount .00"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            disabled={Boolean(isPaid)}
          />

          <label><strong>Payment Method:</strong></label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            disabled={Boolean(isPaid)}
          >
            <option value="">Select Method</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Online">Online</option>
          </select>

          <label><strong>Reference No.:</strong></label>
          <input type="text" value={referenceNo} readOnly style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />

          <label><strong>Name:</strong></label>
          <input type="text" value={name} readOnly style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />

          <label><strong>Email:</strong></label>
          <input type="email" value={email} readOnly style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />

          <label><strong>Contact No.:</strong></label>
          <input type="text" value={contact} readOnly style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />

          <label><strong>Date Paid:</strong></label>
          <input
            type="date"
            value={datePaid}
            onChange={(e) => setDatePaid(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            disabled={Boolean(isPaid)}
          />

          <label><strong>Booking Type:</strong></label>
          <select
            value={bookingType}
            onChange={(e) => setBookingType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
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
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            disabled={Boolean(isPaid)}
          />

          <label><strong>Date of Check-out:</strong></label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            disabled={Boolean(isPaid)}
          />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              style={{ backgroundColor: 'green', color: 'white', padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
              onClick={updatePaymentStatus}
              disabled={Boolean(isPaid)}
            >
              Confirm
            </button>
            <button
              style={{ backgroundColor: 'gray', color: 'white', padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
              onClick={() => { setSelectedPayment(null); resetForm(); }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Styles for the entire component */}
      <style jsx>{`
        /* Container styles */
        .dashboard-container {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          padding: 1rem;
          font-family: 'Arial, sans-serif';
          background-color: #f4f4f9;
        }
        /* Header style */
        .header {
          padding: 1rem;
          background-color: #f0f0f0;
          text-align: center;
          font-weight: bold;
          font-size: 1.2rem;
          margin-bottom: 1rem;
        }
        /* Section title style */
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #4b4b7a;
        }
        /* KPI cards styles */
        .kpi-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .kpi-card {
          background-color: #7c6fdd;
          color: #fff;
          padding: 1rem;
          border-radius: 10px;
          box-shadow: 0 2px 6px rgba(124, 111, 221, 0.4);
          text-align: center;
        }
        /* Tables styling */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 8px;
        }
        thead {
          background-color: #ddd;
        }
        tbody tr:hover {
          background-color: #ffe5e5;
        }
        /* Form container styles */
        .form-section {
          flex: 1 1 300px;
          min-width: 280px;
          background: #fff;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        /* Input styles inside form */
        input, select {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          width: 100%;
        }
        /* Buttons styles */
        button {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}