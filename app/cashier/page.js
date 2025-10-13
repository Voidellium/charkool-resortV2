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

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBookings();
      fetchPaidPayments();
    }
  }, [status]);

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
      const res = await fetch('/api/bookings');
      const data = await res.json();

      // Apply the new filtering logic for unpaid transactions
      const filtered = data.filter(booking => shouldShowInUnpaidTransactions(booking));

      setBookings(filtered || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  }

  async function fetchPaidPayments() {
    try {
      const res = await fetch('/api/payments/today');
      const data = await res.json();
      setPaidPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching paid payments:', err);
      setPaidPayments([]);
    } finally {
      setLoading(false);
    }
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
    const requiredAmount = selectedPayment.amount;
    
    // Determine status based on customer paid amount vs required
    let newStatus = 'pending';
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

  const totalTransactions = bookings.length + paidPayments.length;
  const pendingTransactions = bookings.length;

  // Calculate remaining balance to pay from all unpaid transactions
  const remainingBalance = bookings.reduce((total, booking) => {
    const totalPaid = booking.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const remaining = booking.totalPrice - totalPaid;
    return total + Math.max(0, remaining); // Only add positive remaining balances
  }, 0);

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
          
          {/* KPI Cards */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              backgroundColor: '#7c6fdd',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(124, 111, 221, 0.4)',
              textAlign: 'center',
              flex: 1
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Total Transactions Today</h3>
              <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: '700' }}>{totalTransactions}</p>
            </div>
            <div style={{
              backgroundColor: '#7c6fdd',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(124, 111, 221, 0.4)',
              textAlign: 'center',
              flex: 1
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Pending Transaction</h3>
              <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: '700' }}>{pendingTransactions}</p>
            </div>
            <div style={{
              backgroundColor: '#ff6b6b',
              color: 'white',
              padding: '1rem',
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(255, 107, 107, 0.4)',
              textAlign: 'center',
              flex: 1
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Remaining Balance to Pay</h3>
              <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: '700' }}>₱{(remainingBalance / 100).toFixed(0)}</p>
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
                  {bookings.map((payment) => (
                    <tr
                      key={payment.id}
                      onClick={() => selectPayment(payment)}
                      style={{ 
                        backgroundColor: payment.status === 'pending' ? '#fff3cd' : '#f8f9fa',
                        cursor: 'pointer',
                        borderBottom: '1px solid #dee2e6'
                      }}
                    >
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{payment.id}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{payment.booking?.user?.name || payment.user?.name || 'N/A'}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: payment.status === 'pending' ? '#ffc107' : '#28a745',
                          color: payment.status === 'pending' ? '#212529' : '#fff'
                        }}>
                          {payment.status}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>₱{(payment.totalPrice / 100).toFixed(0)}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>
                        <span style={{
                          color: '#dc3545',
                          fontWeight: '600'
                        }}>
                          ₱{((payment.totalPrice - (payment.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)) / 100).toFixed(0)}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
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
                  {paidPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      onClick={() => selectPayment(payment)}
                      style={{ 
                        backgroundColor: '#d4edda',
                        cursor: 'pointer',
                        borderBottom: '1px solid #dee2e6'
                      }}
                    >
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{payment.id}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{payment.booking?.user?.name || payment.user?.name || 'N/A'}</td>
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
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>₱{(payment.amount / 100).toFixed(0)}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '12px 8px' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
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
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Online">Online</option>
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
              justifyContent: 'center'
            }}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
