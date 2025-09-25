
'use client';
import { useState, useEffect } from 'react';

export default function CheckoutPage() {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card'); // default payment method
  const [paymentOption, setPaymentOption] = useState('full'); // full, half, reservation
  const [enteredAmount, setEnteredAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load bookingId and amount from localStorage on mount
  useEffect(() => {
    const storedBookingId = localStorage.getItem('bookingId');
    const storedAmount = localStorage.getItem('bookingAmount');
    if (storedBookingId) setBookingId(storedBookingId);
    if (storedAmount) { // storedAmount is in cents
      const amountInPesos = (parseFloat(storedAmount) / 100).toFixed(0);
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
    const expectedAmount = getExpectedAmount();
    if (parseFloat(enteredAmount) !== expectedAmount) {
      setMessage('Please enter the exact amount');
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
            amount: parseFloat(enteredAmount), // This is in pesos, which the test API expects
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

      // Existing card payment flow (simplified for brevity)
      // Create PaymentMethod
      const paymentMethodRes = await fetch('/api/payments/method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card',
          card: {
            number: cardNumber,
            exp_month: expMonth,
            exp_year: expYear,
            cvc: cvc,
          },
        }),
      });
      const paymentMethodData = await paymentMethodRes.json();
      if (!paymentMethodRes.ok) {
        setMessage('Failed to create payment method: ' + (paymentMethodData.error || 'Unknown error'));
        setLoading(false);
        return;
      }

      // Attach PaymentMethod to PaymentIntent and confirm
      const confirmRes = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          paymentMethodId: paymentMethodData.id,
          amount: parseFloat(enteredAmount),
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        setMessage('Payment confirmation failed: ' + (confirmData.error || 'Unknown error'));
        setLoading(false);
        return;
      }

      if (confirmData.status === 'succeeded') {
        setMessage('Payment successful! Redirecting...');
        window.location.href = `/confirmation?bookingId=${bookingId}`;
      } else if (confirmData.next_action_url) {
        // Redirect to next action URL if required (e.g., 3DS)
        window.location.href = confirmData.next_action_url;
      } else {
        setMessage('Payment processing, please wait...');
      }
    } catch (error) {
      setMessage('Error processing payment: ' + error.message);
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
            <option value="card">Card</option>
            <option value="TEST">TEST (Development only)</option>
          </select>
        </label>
      </div>

      {paymentMethod === 'card' && (
        <div className="card-details">
          <label>
            Card Number:
            <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4242424242424242" />

          </label>
          <label>
            Expiry Month:
            <input type="text" value={expMonth} onChange={e => setExpMonth(e.target.value)} placeholder="MM" />
          </label>
          <label>
            Expiry Year:
            <input type="text" value={expYear} onChange={e => setExpYear(e.target.value)} placeholder="YY" />
          </label>
          <label>
            CVC:
            <input type="text" value={cvc} onChange={e => setCvc(e.target.value)} placeholder="123" />
          </label>
        </div>
      )}

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
        .card-details label {
          margin-bottom: 1rem;
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
