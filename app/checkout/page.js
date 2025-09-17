'use client';
import { useState, useEffect } from 'react';

export default function CheckoutPage() {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card'); // default payment method
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [testAmount, setTestAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load bookingId and amount from localStorage on mount
  useEffect(() => {
    const storedBookingId = localStorage.getItem('bookingId');
    const storedAmount = localStorage.getItem('bookingAmount');
    if (storedBookingId) setBookingId(storedBookingId);
    if (storedAmount) setAmount(storedAmount);
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    setMessage('');
    try {
      if (paymentMethod === 'TEST') {
        // Development phase only: simulate payment success with TEST method
        // TODO: Remove this block before production deployment
        const res = await fetch('/api/payments/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            amount: parseFloat(testAmount),
            status: 'paid',
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
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Checkout</h2>
      <p>Booking ID: {bookingId}</p>
      <p>Amount: ${amount}</p>

      <label>
        Payment Method:
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
          <option value="card">Card</option>
          <option value="TEST">TEST (Development only)</option>
        </select>
      </label>

      {paymentMethod === 'card' && (
        <>
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
        </>
      )}

      {paymentMethod === 'TEST' && (
        <label>
          Amount to Pay:
          <input type="number" value={testAmount} onChange={e => setTestAmount(e.target.value)} placeholder="Enter amount" />
        </label>
      )}

      <button onClick={handlePayment} disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>

      {message && <p>{message}</p>}

      <style jsx>{`
        label {
          display: block;
          margin-bottom: 1rem;
        }
        input, select {
          width: 100%;
          padding: 0.5rem;
          margin-top: 0.25rem;
          box-sizing: border-box;
        }
        button {
          width: 100%;
          padding: 0.75rem;
          background-color: #6200ee;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
        }
        button:disabled {
          background-color: #999;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
