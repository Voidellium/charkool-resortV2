'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Payment() {
  const [payments, setPayments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch('/api/payments');
        if (!res.ok) throw new Error('Failed to fetch payments');
        const data = await res.json();
        setPayments(data.payments || []);
      } catch (err) {
        console.error(err);
        router.push('/login');
      }
    }
    fetchPayments();
  }, [router]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Payment History</h1>
      {payments.length > 0 ? (
        payments.map((payment) => (
          <div key={payment.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <p><strong>Amount:</strong> ${payment.amount}</p>
            <p><strong>Status:</strong> {payment.status}</p>
            <p><strong>Date:</strong> {new Date(payment.createdAt).toLocaleDateString()}</p>
            {payment.invoice && <p><strong>Invoice:</strong> <a href={payment.invoice} target="_blank">Download</a></p>}
          </div>
        ))
      ) : (
        <p>No payment history available.</p>
      )}
    </div>
  );
}
