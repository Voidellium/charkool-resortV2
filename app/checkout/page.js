
'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function CheckoutPage() {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('gcash'); // default to GCash
  const [paymentOption, setPaymentOption] = useState('full'); // full, half, reservation
  const [enteredAmount, setEnteredAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error'); // 'error' or 'success'
  const [paymentWindow, setPaymentWindow] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Load bookingId and amount from localStorage on mount
  useEffect(() => {
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
      setEnteredAmount(amountInPesos); // default entered amount to full amount in pesos
    }
  }, []);

  // Calculate expected amount based on payment option
  const getExpectedAmount = () => {
    const fullAmount = parseFloat(amount); // amount is in pesos
    if (paymentOption === 'full') return fullAmount;
    if (paymentOption === 'half') return Math.round(fullAmount / 2);
    if (paymentOption === 'reservation') return 2000; // 1000 pesos
    return fullAmount;
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
        e.returnValue = 'Leaving this page will cancel your pending booking. Are you sure?';
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
          let paymentStatus;
          let bookingStatus;

          if (paymentOption === 'reservation') {
            paymentStatus = 'reservation';
            bookingStatus = 'pending';
          } else if (paymentOption === 'half') {
            paymentStatus = 'partial';
            bookingStatus = 'pending'; // keep booking status pending as requested
          } else {
            paymentStatus = 'paid';
            bookingStatus = 'pending'; // keep booking status pending as requested
          }

          const res = await fetch('/api/payments/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId,
              amount: parseFloat(enteredAmount) * 100,
              status: paymentStatus,
              bookingStatus: bookingStatus,
              paymentType: paymentOption,
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
          paymentType: paymentOption,
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
              <p>Total Cost: <strong>₱{amount ? parseFloat(amount).toLocaleString() : '0'}</strong></p>
            </div>

            <div className="payment-form">
              <div className="section">
                <label>
                  Payment Option
                  <select 
                    value={paymentOption} 
                    onChange={e => {
                      setPaymentOption(e.target.value);
                      const newAmount = e.target.value === 'full' ? amount : e.target.value === 'half' ? Math.round(parseFloat(amount) / 2).toString() : '2000';
                      setEnteredAmount(newAmount);
                      setMessage('');
                    }}
                  >
                    <option value="full">Full Payment</option>
                    <option value="half">Half Payment</option>
                    <option value="reservation">Reservation Only</option>
                  </select>
                </label>
              </div>

              <div className="section">
                <label>
                  ₱ Amount to Pay
                  <input
                    type="number"
                    value={enteredAmount}
                    onChange={e => {
                      setEnteredAmount(e.target.value);
                      setMessage('');
                    }}
                    placeholder="Enter amount"
                    step="1"
                    min="0"
                  />
                </label>
              </div>

              <div className="section">
                <label>
                  Payment Method
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="gcash">GCash</option>
                    <option value="grab_pay">Maya</option>
                    <option value="TEST">TEST (Development only)</option>
                  </select>
                </label>
              </div>

              <button className="primary-btn" onClick={handlePayment} disabled={loading}>
                {loading ? 'Processing...' : `Pay with ${paymentMethod.toUpperCase()}`}
              </button>

              {message && <p className={`message ${messageType}`}>{message}</p>}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .checkout-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%);
          padding: 2rem;
        }

        .checkout-card {
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          display: flex;
          width: 900px;
          max-width: 95%;
        }

        .checkout-left {
          background: linear-gradient(135deg, #fcd34d 100%);
          padding: 3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          width: 35%;
        }

        .checkout-right {
          padding: 3rem;
          flex: 1;
        }

        .logo-img {
          margin-bottom: 1.5rem;
          border-radius: 15px;
          background: white;
          padding: 1rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .tagline {
          text-align: center;
          font-size: 1.1rem;
          line-height: 1.6;
          margin: 0;
        }

        .checkout-title {
          color: #333;
          margin: 0 0 2rem;
          font-size: 1.8rem;
        }

        .booking-info {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .booking-info p {
          margin: 0.5rem 0;
          color: #666;
        }

        .booking-info strong {
          color: #333;
        }

        .section {
          margin-bottom: 1.5rem;
        }

        .section label {
          display: block;
          margin-bottom: 0.5rem;
          color: #666;
        }

        select, input {
          width: 100%;
          padding: 0.8rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          margin-top: 0.5rem;
        }

        .primary-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #fcd34d 50%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .primary-btn:hover {
          transform: translateY(-2px);
        }

        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .message {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
        }

        .error {
          background: #fee2e2;
          color: #dc2626;
        }

        .success {
          background: #dcfce7;
          color: #16a34a;
        }

        .info {
          background: #dbeafe;
          color: #2563eb;
        }

        @media (max-width: 768px) {
          .checkout-card {
            flex-direction: column;
          }

          .checkout-left {
            width: 100%;
            padding: 2rem;
          }

          .checkout-right {
            padding: 2rem;
          }
        }
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          background: linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        h2 {
          text-align: center;
          margin-bottom: 1.5rem;
          color: #333;
        }
        p {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 1rem;
          text-align: center;
        }
        .section {
          margin-bottom: 1.5rem;
        }
        label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #444;
        }
        select, input {
          width: 100%;
          padding: 0.6rem;
          font-size: 1rem;
          border: 1px solid #ccc;
          border-radius: 6px;
          box-sizing: border-box;
          transition: border-color 0.3s ease;
        }
        select:focus, input:focus {
          border-color: #FEBE52;
          outline: none;
          box-shadow: 0 0 5px rgba(254, 190, 82, 0.4);
        }
        button {
          width: 100%;
          padding: 0.75rem;
          background-color: #FEBE52;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        button:hover:not(:disabled) {
          background-color: #FEB424;
          transform: translateY(-1px);
        }
        button:disabled {
          background-color: #FFE4A7;
          cursor: not-allowed;
        }
        .message {
          margin-top: 1rem;
          font-weight: 600;
          text-align: center;
          padding: 10px;
          border-radius: 4px;
        }
        .message.error {
          color: #721c24;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
        }
        .message.success {
          color: #155724;
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
        }
        .message.info {
          color: #004085;
          background-color: #cce5ff;
          border: 1px solid #b8daff;
        }
      `}</style>
    </>
  );
}
