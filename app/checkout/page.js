
'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
import { useNavigationContext } from '../../context/NavigationContext';
import { NavigationConfirmationModal } from '../../components/CustomModals';

export default function CheckoutPage() {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('gcash'); // default to GCash
  const [paymentOption, setPaymentOption] = useState('reservation'); // reservation only
  const [enteredAmount, setEnteredAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error'); // 'error' or 'success'
  const [paymentWindow, setPaymentWindow] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [totalRooms, setTotalRooms] = useState(0);
  const [heldUntil, setHeldUntil] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Navigation Guard Setup
  const navigationContext = useNavigationContext();
  const navigationGuard = useNavigationGuard({
    trackPayment: true,
    customMessage: 'Leaving during payment may cancel your reservation. Your booking will be lost if not completed within 15 minutes.'
  });

  // Load bookingId and amount from localStorage on mount
  useEffect(() => {
    // First, clean up any expired bookings
    fetch('/api/cleanup/expired-bookings', { method: 'POST' })
      .catch(err => console.warn('Cleanup failed:', err));

    const storedBookingId = localStorage.getItem('bookingId');
    const storedAmount = localStorage.getItem('bookingAmount');
    if (storedBookingId) {
      // Check if booking still exists and is not cancelled
      fetch(`/api/bookings/${storedBookingId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Booking not found');
          }
          return res.json();
        })
        .then(data => {
          if (data.status === 'Cancelled') {
            throw new Error('Booking cancelled');
          }
          setBookingId(storedBookingId);
          setHeldUntil(data.heldUntil ? new Date(data.heldUntil) : null);
          // Compute total rooms from booking details
          try {
            const roomsCount = Array.isArray(data.rooms)
              ? data.rooms.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
              : 0;
            setTotalRooms(roomsCount);
            // Set the entered amount to the expected reservation fee
            const expected = (roomsCount || 0) * 2000;
            setEnteredAmount(String(expected));
          } catch (e) {
            console.error('Failed to compute total rooms for reservation fee:', e);
          }
        })
        .catch(err => {
          console.error('Booking check error:', err);
          localStorage.removeItem('bookingId');
          localStorage.removeItem('bookingAmount');
          window.location.href = '/booking';
        });
    }
    if (storedAmount) {
      const amountInPesos = parseFloat(storedAmount).toFixed(0);
      setAmount(amountInPesos);
      // Keep full booking amount for display only; enteredAmount will be set from booking rooms
    }
  }, []);

  // Track payment state for navigation protection
  useEffect(() => {
    navigationContext.updatePaymentState({
      isActive: Boolean(bookingId && !paymentCompleted && !isExpired),
      bookingId: bookingId
    });
  }, [bookingId, paymentCompleted, isExpired]);

  // Clear navigation states when payment completes
  useEffect(() => {
    if (paymentCompleted) {
      navigationContext.clearAllStates();
    }
  }, [paymentCompleted]);

  // Countdown timer for booking expiration
  useEffect(() => {
    if (!heldUntil) {
      setTimeRemaining('');
      setIsExpired(false);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const timeLeft = heldUntil.getTime() - now.getTime();
      
      if (timeLeft <= 0) {
        setTimeRemaining('');
        setIsExpired(true);
        setMessageType('error');
        setMessage('Your booking has expired. Redirecting to booking page...');
        clearInterval(interval);
        setTimeout(() => {
          localStorage.removeItem('bookingId');
          localStorage.removeItem('bookingAmount');
          window.location.href = '/booking';
        }, 3000);
        return;
      }

      const minutes = Math.floor(timeLeft / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [heldUntil]);

  // Calculate expected amount based on payment option
  const getExpectedAmount = () => {
    // Reservation fee is ₱2000 per room unit booked
    const rooms = Number(totalRooms) || 0;
    return rooms * 2000;
  };

  // Function to handle payment window status
  useEffect(() => {
      if (paymentWindow) {
      // Listen for message from popup window
      const handleMessage = (event) => {
        if (event.data.type === 'PAYMENT_COMPLETED') {
          setPaymentWindow(null);
          if (event.data.status === 'returned' || event.data.status === 'success') {
            // Poll payment status until confirmed or failed
            setMessageType('info');
            setMessage('Verifying payment status, please wait...');
            setLoading(true);

            let attempts = 0;
            const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
            const interval = setInterval(async () => {
              attempts++;
              try {
                const res = await fetch(`/api/payments/status?bookingId=${event.data.bookingId}`);
                const data = await res.json();
                if (data.status === 'paid') {
                  clearInterval(interval);
                  setPaymentCompleted(true);
                  localStorage.removeItem('bookingId');
                  localStorage.removeItem('bookingAmount');
                  setMessageType('success');
                  setMessage('Payment successful! Redirecting...');
                  setLoading(false);
                  window.location.href = `/confirmation?bookingId=${event.data.bookingId}`;
                } else if (data.status === 'failed') {
                  clearInterval(interval);
                  setMessageType('error');
                  setMessage('Payment failed. Please try again.');
                  setLoading(false);
                } else if (attempts >= maxAttempts) {
                  clearInterval(interval);
                  setMessageType('error');
                  setMessage('Payment verification timed out. Please check your payment status later.');
                  setLoading(false);
                }
              } catch (error) {
                clearInterval(interval);
                setMessageType('error');
                setMessage('Error verifying payment status. Please contact support.');
                setLoading(false);
              }
            }, 2000);
          } else {
            setMessageType('error');
            setMessage('Payment was not completed. Please try again.');
            setLoading(false);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Also check if window is closed without message
      const checkWindow = setInterval(() => {
        if (paymentWindow.closed) {
          clearInterval(checkWindow);
          setPaymentWindow(null);
          setMessageType('error');
          setMessage('Payment window was closed. Please try again if payment was not completed.');
          setLoading(false);
        }
      }, 500);

      return () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkWindow);
      };
    }
  }, [paymentWindow]);

  // Before unload warning if payment not completed
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!paymentCompleted && bookingId) {
        e.preventDefault();
  e.returnValue = 'Leaving this page may cancel your pending booking if the reservation fee is not paid within 15 minutes. Are you sure?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [paymentCompleted, bookingId]);

  // Function to check payment status
  const checkPaymentStatus = async (bookingId) => {
    try {
      const res = await fetch(`/api/payments/status?bookingId=${bookingId}`);
      const data = await res.json();
      
      if (data.status === 'paid') {
        setMessageType('success');
        setMessage('Payment successful! Redirecting...');
        setTimeout(() => {
          window.location.href = `/confirmation?bookingId=${bookingId}`;
        }, 2000);
      } else if (data.status === 'failed') {
        setMessageType('error');
        setMessage('Payment failed. Please try again.');
      } else {
        setMessageType('error');
        setMessage('Payment was cancelled or expired. Please try again.');
      }
    } catch (error) {
      setMessageType('error');
      setMessage('Failed to verify payment status. Please contact support.');
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('error');

    // Validation
    if (!bookingId) {
      setMessage('Booking ID is missing. Please restart the booking process.');
      setMessageType('error');
      setLoading(false);
      return;
    }
    if (!enteredAmount || parseFloat(enteredAmount) <= 0) {
      setMessage('Please enter a valid amount greater than 0.');
      setMessageType('error');
      setLoading(false);
      return;
    }
    const expectedAmount = getExpectedAmount();
    if (parseFloat(enteredAmount) !== expectedAmount) {
      setMessage(`Amount must match the expected amount: ₱${expectedAmount}`);
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
        if (paymentMethod === 'TEST') {
          // Development phase only: simulate payment success with TEST method
          let paymentStatus = 'reservation';
          let bookingStatus = 'pending';

          const res = await fetch('/api/payments/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId,
              amount: parseFloat(enteredAmount), // Don't multiply by 100 for TEST - API expects pesos
              status: paymentStatus,
              bookingStatus: bookingStatus,
              paymentType: 'reservation',
              method: 'TEST',
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setMessageType('error');
            setMessage('Test payment failed: ' + (data.error || 'Unknown error'));
            setLoading(false);
            return;
          }
          setPaymentCompleted(true);
          localStorage.removeItem('bookingId');
          localStorage.removeItem('bookingAmount');
          setMessageType('success');
          setMessage('Test payment successful! Redirecting...');
          setTimeout(() => {
            window.location.href = `/confirmation?bookingId=${bookingId}`;
          }, 2000);
          return;
        }

      // Handle GCash or PayMaya payment
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          amount: parseFloat(enteredAmount),
          paymentMethod,
          paymentType: 'reservation',
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      if (data.redirectUrl) {
        // Open payment window in a popup
        const width = 500;
        const height = 700;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        const paymentPopup = window.open(
          data.redirectUrl,
          'PaymentWindow',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (paymentPopup) {
          setPaymentWindow(paymentPopup);
          setMessage('Please complete the payment in the popup window.');
          setMessageType('info');
        } else {
          setMessageType('error');
          setMessage('Popup was blocked. Please allow popups and try again.');
          setLoading(false);
        }
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      setMessageType('error');
      setMessage('Payment Error: ' + (error.message || 'Please try again.'));
      setLoading(false);
    }
  };

  return (
    <>
      <div className="checkout-wrapper">
        <div className="checkout-card">
          <div className="checkout-left">
            <Image src="/images/logo.png" alt="Charkool Logo" width={150} height={150} className="logo-img"/>
            <p className="tagline">Secure Payment Gateway<br/>Charkool Leisure Beach Resort</p>
          </div>
          <div className="checkout-right">
            <h2 className="checkout-title">Complete Your Payment</h2>
            
            <div className="booking-info">
              <p>Total Booking Cost: <strong>₱{amount ? parseFloat(amount).toLocaleString() : '0'}</strong></p>
              <p>Rooms Selected: <strong>{totalRooms}</strong></p>
              <p>Reservation Fee Due Now: <strong>₱{(Number(totalRooms) * 2000).toLocaleString()}</strong></p>
              {timeRemaining && !isExpired && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '8px 12px', 
                  backgroundColor: '#fef3c7', 
                  borderRadius: '6px', 
                  border: '1px solid #f59e0b',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, color: '#92400e', fontWeight: 'bold' }}>
                    ⏰ Time remaining: {timeRemaining}
                  </p>
                  <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                    Complete your payment before time expires
                  </p>
                </div>
              )}
            </div>

            <div className="payment-form">
              <div className="section">
                <label>
                  Payment Option
                  <input type="text" value="Reservation Only" readOnly />
                </label>
              </div>

              <div className="section">
                <label>
                  ₱ Reservation Fee (₱2000 × rooms)
                  <input
                    type="number"
                    value={enteredAmount}
                    readOnly
                    placeholder="Enter amount"
                    step="1"
                    min="0"
                  />
                </label>
              </div>

              {/* Payment procedure note (mirrored from booking page) */}
              <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981' }}>
                <p><strong>Payment Procedure:</strong> You will only need to pay the reservation fee at checkout.</p>
                <p>
                  Reservation fee is <strong>₱2,000</strong> per room. You currently have <strong>{Number(totalRooms)}</strong> room(s),
                  so your reservation fee is <strong>₱{(Number(totalRooms) * 2000).toLocaleString()}</strong>.
                </p>
                <p style={{ color: '#065f46' }}>Example: 2 rooms → ₱4,000 reservation fee.</p>
              </div>

              <div className="section">
                <label>
                  Payment Method
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">Maya</option>
                    <option value="TEST">TEST (Development only)</option>
                  </select>
                </label>
              </div>

              <button 
                className="primary-btn" 
                onClick={handlePayment} 
                disabled={loading || !bookingId || (Number(totalRooms) <= 0) || isExpired}
                style={isExpired ? { backgroundColor: '#9ca3af', cursor: 'not-allowed' } : {}}
              >
                {isExpired ? 'Booking Expired' : loading ? 'Processing...' : `Pay Reservation with ${paymentMethod.toUpperCase()}`}
              </button>

              {message && <p className={`message ${messageType}`}>{message}</p>}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .checkout-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
          padding: 2rem 1rem;
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .checkout-wrapper::before {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(254, 190, 82, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          top: -250px;
          right: -250px;
          animation: float 6s ease-in-out infinite;
        }

        .checkout-wrapper::after {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(252, 211, 77, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          bottom: -200px;
          left: -200px;
          animation: float 8s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .checkout-card {
          background: white;
          border-radius: 24px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.12),
            0 10px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          display: flex;
          width: 950px;
          max-width: 95%;
          position: relative;
          z-index: 1;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .checkout-left {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #7c2d12;
          width: 38%;
          position: relative;
          overflow: hidden;
        }

        .checkout-left::before {
          content: '';
          position: absolute;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          top: -100px;
          left: -100px;
        }

        .checkout-left::after {
          content: '';
          position: absolute;
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          bottom: -75px;
          right: -75px;
        }

        .checkout-right {
          padding: 3rem 2.5rem;
          flex: 1;
          background: #ffffff;
        }

        .logo-img {
          margin-bottom: 2rem;
          border-radius: 20px;
          background: white;
          padding: 1.2rem;
          box-shadow: 
            0 10px 25px rgba(0, 0, 0, 0.15),
            0 4px 10px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
          z-index: 2;
          position: relative;
        }

        .logo-img:hover {
          transform: scale(1.05);
        }

        .tagline {
          text-align: center;
          font-size: 1.15rem;
          line-height: 1.7;
          margin: 0;
          font-weight: 600;
          color: #78350f;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
          z-index: 2;
          position: relative;
        }

        .checkout-title {
          color: #1f2937;
          margin: 0 0 1.5rem;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .checkout-title::before {
          content: '💳';
          font-size: 1.8rem;
        }

        .booking-info {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          border: 2px solid #fde68a;
          box-shadow: 0 4px 15px rgba(251, 191, 36, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .booking-info:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(251, 191, 36, 0.15);
        }

        .booking-info p {
          margin: 0.75rem 0;
          color: #78350f;
          font-size: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #fde68a;
        }

        .booking-info p:last-child {
          border-bottom: none;
          font-size: 1.1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px solid #fbbf24;
        }

        .booking-info strong {
          color: #92400e;
          font-weight: 700;
          font-size: 1.1em;
        }

        .payment-form {
          animation: fadeIn 0.5s ease-out 0.2s both;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section {
          margin-bottom: 1.75rem;
        }

        .section label {
          display: block;
          margin-bottom: 0.75rem;
          color: #374151;
          font-weight: 600;
          font-size: 0.95rem;
          letter-spacing: 0.3px;
        }

        select, input {
          width: 100%;
          padding: 0.95rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          margin-top: 0.5rem;
          transition: all 0.3s ease;
          background: #f9fafb;
          font-family: inherit;
        }

        select:hover, input:hover {
          border-color: #fbbf24;
          background: white;
        }

        select:focus, input:focus {
          border-color: #f59e0b;
          outline: none;
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1);
          background: white;
        }

        input[readonly] {
          background: #f3f4f6;
          cursor: not-allowed;
          color: #6b7280;
        }

        .primary-btn {
          width: 100%;
          padding: 1.1rem;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #7c2d12;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-top: 1rem;
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(251, 191, 36, 0.4);
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .primary-btn:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #d1d5db;
          color: #9ca3af;
          box-shadow: none;
        }

        .message {
          margin-top: 1.25rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          text-align: center;
          font-weight: 600;
          animation: slideIn 0.3s ease-out;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .error {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          border: 2px solid #fca5a5;
        }

        .error::before {
          content: '⚠️';
        }

        .success {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border: 2px solid #6ee7b7;
        }

        .success::before {
          content: '✓';
        }

        .info {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          border: 2px solid #93c5fd;
        }

        .info::before {
          content: 'ℹ️';
        }

        @media (max-width: 968px) {
          .checkout-card {
            width: 90%;
          }
        }

        @media (max-width: 768px) {
          .checkout-wrapper {
            padding: 1rem;
          }

          .checkout-card {
            flex-direction: column;
            width: 100%;
          }

          .checkout-left {
            width: 100%;
            padding: 2rem 1.5rem;
          }

          .checkout-right {
            padding: 2rem 1.5rem;
          }

          .checkout-title {
            font-size: 1.6rem;
          }

          .booking-info {
            padding: 1.25rem;
          }

          .booking-info p {
            font-size: 0.9rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
        }

        @media (max-width: 480px) {
          .checkout-wrapper {
            padding: 0.5rem;
          }

          .checkout-right {
            padding: 1.5rem 1rem;
          }

          .checkout-title {
            font-size: 1.4rem;
          }

          select, input {
            padding: 0.85rem;
            font-size: 0.95rem;
          }

          .primary-btn {
            padding: 1rem;
            font-size: 1rem;
          }
        }
      `}</style>

      {/* Navigation Confirmation Modal */}
      <NavigationConfirmationModal 
        show={navigationGuard.showModal}
        onStay={navigationGuard.handleStay}
        onLeave={navigationGuard.handleLeave}
        context={navigationGuard.context}
        message={navigationGuard.message}
      />
    </>
  );
}
