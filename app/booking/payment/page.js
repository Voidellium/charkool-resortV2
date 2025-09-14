"use client";
import { useState } from "react";

export default function PaymentPage() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState(null);

  const handleCreatePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), bookingId: "BK001" }),
      });

      const data = await res.json();

      if (res.ok) {
        setPaymentIntent(data.data);
      } else {
        alert("Error: " + JSON.stringify(data.error));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>PayMongo Checkout Test</h1>
      <input
        type="number"
        placeholder="Enter Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ marginRight: "10px" }}
      />
      <button onClick={handleCreatePayment} disabled={loading}>
        {loading ? "Processing..." : "Create PaymentIntent"}
      </button>

      {paymentIntent && (
        <div style={{ marginTop: "20px" }}>
          <h3>Payment Intent Created</h3>
          <p>ID: {paymentIntent.id}</p>
          <p>Client Key: {paymentIntent.attributes.client_key}</p>
        </div>
      )}
    </div>
  );
}
