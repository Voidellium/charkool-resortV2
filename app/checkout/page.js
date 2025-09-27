
'use client';
import { useState, useEffect } from 'react';

export default function CheckoutPage() {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TEST'); // default payment method
  const [paymentOption, setPaymentOption] = useState('full'); // full, half, reservation
  const [enteredAmount, setEnteredAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load bookingId and amount from localStorage on mount
  useEffect(() => {
    const storedBookingId = localStorage.getItem('bookingId');
    const storedAmount = localStorage.getItem('bookingAmount');
    if (storedBookingId) setBookingId(storedBookingId);
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
    if (paymentOption === 'reservation') return 1000; // 1000 pesos
    return fullAmount;
  };

  const handlePayment = async () => {
    setLoading(true);
    setMessage('');

    // Validation
    if (!bookingId) {
      setMessage('Booking ID is missing. Please restart the booking process.');
      setLoading(false);
      return;
    }
    if (!enteredAmount || parseFloat(enteredAmount) <= 0) {
      setMessage('Please enter a valid amount greater than 0.');
      setLoading(false);
      return;
    }
    const expectedAmount = getExpectedAmount();
    if (parseFloat(enteredAmount) !== expectedAmount) {
      setMessage(`Amount must match the expected amount: ₱${expectedAmount}`);
      setLoading(false);
      return;
    }

    try {
      if (paymentMethod === 'TEST') {
        // Development phase only: simulate payment success with TEST method
        // TODO: Remove this block before production deployment
        let paymentStatus;
        let bookingStatus;

        // Set appropriate status based on payment option
        if (paymentOption === 'reservation') {
          paymentStatus = 'pending';
          bookingStatus = 'pending';
        } else if (paymentOption === 'half') {
          paymentStatus = 'partial';
          bookingStatus = 'confirmed';
        } else {
          paymentStatus = 'paid';
          bookingStatus = 'confirmed';
        }

        const res = await fetch('/api/payments/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            amount: parseFloat(enteredAmount) * 100, // in cents for backend
            status: paymentStatus,
            bookingStatus: bookingStatus,
            paymentType: paymentOption,
            method: 'TEST',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage('Test payment failed: ' + (data.error || 'Unknown error'));
          setLoading(false);
          return;
        }
        setMessage('Test payment successful! Redirecting...');
        window.location.href = `/confirmation?bookingId=${bookingId}`;
        return;
      }

      // Card payment not available
      setMessage('Card payment is not available at this time.');
    } catch (error) {
      setMessage('An unexpected error occurred: ' + (error.message || 'Please try again.'));
    }
    setLoading(false);
  };

  return (
    <div className="payment-gateway-container">
      <h2>Checkout</h2>
      <p>Booking ID: {bookingId || 'N/A'}</p>
      <p>Original Amount: ₱{amount ? parseFloat(amount).toLocaleString() : '0'}</p>

      <div className="section">
        <label>
          Payment Option:
          <select value={paymentOption} onChange={e => {
            setPaymentOption(e.target.value);
            const newAmount = e.target.value === 'full' ? amount : e.target.value === 'half' ? Math.round(parseFloat(amount) / 2).toString() : '1000';
            setEnteredAmount(newAmount);
            setMessage('');
          }}>
            <option value="full">Full Payment</option>
            <option value="half">Half Payment</option>
            <option value="reservation">Reservation Only</option>
          </select>
        </label>
      </div>

      <div className="section">
        <label>
          Amount to Pay:
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
          Payment Method:
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="TEST">TEST (Development only)</option>
          </select>
        </label>
      </div>

      <button onClick={handlePayment} disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>

      {message && <p className="message">{message}</p>}

      <style jsx>{`
        .payment-gateway-container {
          max-width: 400px;
          margin: 2rem auto;
          padding: 2rem;
          border: 1px solid #ccc;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          background: #fff;
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
          border-color: #6200ee;
          outline: none;
          box-shadow: 0 0 5px rgba(98,0,238,0.5);
        }
        button {
          width: 100%;
          padding: 0.75rem;
          background-color: #6200ee;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1.1rem;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        button:hover:not(:disabled) {
          background-color: #4b00b5;
        }
        button:disabled {
          background-color: #999;
          cursor: not-allowed;
        }
        .message {
          margin-top: 1rem;
          color: red;
          font-weight: 600;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
