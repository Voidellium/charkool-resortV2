'use client';
import { useEffect } from 'react';

export default function CheckoutPage() {
  useEffect(() => {
    const createPayment = async () => {
      try {
        const bookingId = localStorage.getItem('bookingId');
        const amount = localStorage.getItem('bookingAmount');

        if (!bookingId || !amount) {
          alert('Missing booking details.');
          return;
        }

        // Call backend
        const res = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, amount }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert('Payment creation failed.');
          return;
        }

        // Redirect user to PayMongo checkout
        window.location.href = `https://paymongo.com/checkout/${data.clientKey}`;
      } catch (err) {
        console.error('Checkout Error:', err);
        alert('Something went wrong.');
      }
    };

    createPayment();
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Redirecting to PayMongo...</h2>
      <p>Please wait while we set up your payment.</p>
    </div>
  );
}
