'use client';
import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, CalendarCheck2, CreditCard, Printer } from 'lucide-react';

// Global modal styles for blur and centering
// Add this at the top level of the file so it applies to all modals
// Uses styled-jsx global to ensure it works everywhere
const ModalGlobalStyles = () => (
  <style jsx global>{`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1200;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0,0,0,0.18);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      transition: background 0.2s;
    }
    .modal-content {
      position: relative;
      margin: 0 auto;
      top: 0;
      left: 0;
      transform: none;
    }
    .fade-in {
      animation: fadeIn 0.2s ease-in;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `}</style>
);

// Hook for Reschedule Request Modal (Superadmin)
export function useRescheduleModal() {
  const [modal, setModal] = useState({ show: false, request: null });
  return [modal, setModal];
}

// Reschedule Details Modal (Superadmin)
export function RescheduleDetailsModal({ modal, setModal, onApprove, onDeny }) {
  if (!modal?.show || !modal.request) return null;
  const req = modal.request;

  const status = req.status;
  let statusDisplay = null;
  if (status === 'APPROVED') {
    statusDisplay = <div style={{ color: '#388e3c', fontWeight: 700, fontSize: 18, textAlign: 'center', marginTop: 24 }}>Request Approved</div>;
  } else if (status === 'DENIED') {
    statusDisplay = <div style={{ color: '#d32f2f', fontWeight: 700, fontSize: 18, textAlign: 'center', marginTop: 24 }}>Request Disapproved</div>;
  }
  return (
    <div className="modal-overlay fade-in">
      <ModalGlobalStyles />
      <div className="modal-content" style={{ 
        background: 'linear-gradient(135deg, #febe52 0%, #ebd591 100%)', 
        padding: 32, 
        borderRadius: 16, 
        width: 420, 
        maxWidth: '95%', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.13)', 
        position: 'relative' 
      }}>
        <button 
          style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            fontSize: 22, 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: '#6b4700' 
          }} 
          onClick={() => setModal({ show: false, request: null })}
        >
          ×
        </button>
        <h2 style={{ margin: 0, color: '#6b4700', fontWeight: 700 }}>Reschedule Request</h2>
        <div style={{ margin: '18px 0', color: '#6b4700', fontWeight: 500 }}>
          <div><b>Booking ID:</b> {req.bookingId}</div>
          <div><b>Guest:</b> {req.user?.firstName} {req.user?.lastName}</div>
          <div><b>Old Dates:</b> {new Date(req.oldCheckIn).toLocaleDateString()} to {new Date(req.oldCheckOut).toLocaleDateString()}</div>
          <div><b>Requested Dates:</b> {new Date(req.newCheckIn).toLocaleDateString()} to {new Date(req.newCheckOut).toLocaleDateString()}</div>
          {req.context && <div style={{ marginTop: 8 }}><b>Guest Context:</b> <span style={{ color: '#7c4a00' }}>{req.context}</span></div>}
        </div>
        {status === 'PENDING' ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button 
              style={{ 
                flex: 1, 
                background: 'linear-gradient(135deg, #56A86B 0%, #b6e2a1 100%)', 
                color: '#fff', 
                fontWeight: 600, 
                border: 'none', 
                borderRadius: 8, 
                padding: '12px 0', 
                fontSize: 16, 
                cursor: 'pointer', 
                boxShadow: '0 2px 8px #b6e2a1' 
              }} 
              onClick={onApprove}
            >
              Approve
            </button>
            <button 
              style={{ 
                flex: 1, 
                background: 'linear-gradient(135deg, #dc2626 0%, #fbbf24 100%)', 
                color: '#fff', 
                fontWeight: 600, 
                border: 'none', 
                borderRadius: 8, 
                padding: '12px 0', 
                fontSize: 16, 
                cursor: 'pointer', 
                boxShadow: '0 2px 8px #fbbf24' 
              }} 
              onClick={onDeny}
            >
              Disapprove
            </button>
          </div>
        ) : statusDisplay}
      </div>
    </div>
  );
}

// Approve Confirmation Modal
export function ApproveRescheduleModal({ show, onClose, onConfirm }) {
  if (!show) return null;
  
  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1300 }}>
      <ModalGlobalStyles />
      <div className="modal-content" style={{ 
        background: 'linear-gradient(135deg, #febe52 0%, #ebd591 100%)', 
        padding: 28, 
        borderRadius: 14, 
        width: 350, 
        maxWidth: '95%', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.13)', 
        position: 'relative' 
      }}>
        <button 
          style={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            fontSize: 20, 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: '#6b4700' 
          }} 
          onClick={onClose}
        >
          ×
        </button>
        <h3 style={{ color: '#6b4700', fontWeight: 700, margin: 0 }}>Approve Reschedule?</h3>
        <div style={{ margin: '18px 0', color: '#6b4700' }}>
          Are you sure you want to approve this reschedule request?
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button 
            style={{ 
              flex: 1, 
              background: 'linear-gradient(135deg, #56A86B 0%, #b6e2a1 100%)', 
              color: '#fff', 
              fontWeight: 600, 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 0', 
              fontSize: 15, 
              cursor: 'pointer' 
            }} 
            onClick={onConfirm}
          >
            Approve
          </button>
          <button 
            style={{ 
              flex: 1, 
              background: '#eee', 
              color: '#6b4700', 
              fontWeight: 600, 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 0', 
              fontSize: 15, 
              cursor: 'pointer' 
            }} 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Deny Modal with Context
export function DenyRescheduleModal({ show, onClose, onConfirm }) {
  const [context, setContext] = useState('');
  
  if (!show) return null;
  
  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1300 }}>
      <ModalGlobalStyles />
      <div className="modal-content" style={{ 
        background: 'linear-gradient(135deg, #febe52 0%, #ebd591 100%)', 
        padding: 28, 
        borderRadius: 14, 
        width: 350, 
        maxWidth: '95%', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.13)', 
        position: 'relative' 
      }}>
        <button 
          style={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            fontSize: 20, 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: '#6b4700' 
          }} 
          onClick={onClose}
        >
          ×
        </button>
        <h3 style={{ color: '#6b4700', fontWeight: 700, margin: 0 }}>Disapprove Reschedule</h3>
        <div style={{ margin: '18px 0', color: '#6b4700' }}>
          Please provide a reason/context for disapproval:
        </div>
        <textarea 
          value={context} 
          onChange={e => setContext(e.target.value)} 
          rows={3} 
          style={{ 
            width: '100%', 
            borderRadius: 8, 
            border: '1px solid #e0c97a', 
            padding: 8, 
            fontSize: 15, 
            marginBottom: 12, 
            resize: 'vertical' 
          }} 
          placeholder="Enter reason/context..." 
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button 
            style={{ 
              flex: 1, 
              background: 'linear-gradient(135deg, #dc2626 0%, #fbbf24 100%)', 
              color: '#fff', 
              fontWeight: 600, 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 0', 
              fontSize: 15, 
              cursor: 'pointer' 
            }} 
            onClick={() => onConfirm(context)}
          >
            Disapprove
          </button>
          <button 
            style={{ 
              flex: 1, 
              background: '#eee', 
              color: '#6b4700', 
              fontWeight: 600, 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 0', 
              fontSize: 15, 
              cursor: 'pointer' 
            }} 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for Early Check-In Modal (Receptionist)
export function useEarlyCheckInModal() {
  const [earlyCheckInModal, setEarlyCheckInModal] = useState({ show: false, date: null });
  return [earlyCheckInModal, setEarlyCheckInModal];
}

export function EarlyCheckInModal({ modal, setModal }) {
  if (!modal?.show) return null;
  
  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1100 }}>
      <ModalGlobalStyles />
      <div
        className="modal-content"
        style={{
          background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
          padding: '20px',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.15rem', color: '#3d2c00' }}>
            Early Check-In Not Allowed
          </h3>
          <button
            className="modal-close-button"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: '1.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#92400E',
              padding: '2px 8px',
              lineHeight: 1,
              zIndex: 2
            }}
            onClick={() => setModal({ show: false, date: null })}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: '20px', color: '#3d2c00' }}>
          The booking starts at: <b>{modal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setModal({ show: false, date: null })}
            style={{
              minWidth: '100px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for Override Modal (Super Admin)
export function useOverrideModal() {
  const [overrideModal, setOverrideModal] = useState({ show: false, type: '', date: null, bookingId: null });
  return [overrideModal, setOverrideModal];
}

export function OverrideModal({ modal, setModal, onConfirm }) {
  if (!modal?.show) return null;
  
  return (
    <div
      className="modal-overlay fade-in"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      <ModalGlobalStyles />
      <div
        className="modal-content"
        style={{
          background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
          padding: '20px',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.15rem', color: '#3d2c00' }}>
            {modal.type === 'checkin' ? 'Confirm to manually override check in?' : 'Confirm to manually override check out?'}
          </h3>
          <button
            className="modal-close-button"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: '1.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#92400E',
              padding: '2px 8px',
              lineHeight: 1,
              zIndex: 2
            }}
            onClick={() => setModal({ show: false, type: '', date: null, bookingId: null })}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: '20px', color: '#3d2c00' }}>
          {modal.type === 'checkin' ? (
            <>This booking starts at: <b>{modal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b></>
          ) : (
            <>This booking ends at: <b>{modal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b></>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              setModal({ show: false, type: '', date: null, bookingId: null });
            }}
            style={{
              minWidth: '100px',
              padding: '8px 16px',
              backgroundColor: '#56A86B',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => setModal({ show: false, type: '', date: null, bookingId: null })}
            style={{
              minWidth: '100px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for Change Modal (Cashier)
export function useChangeModal() {
  const [modal, setModal] = useState({ show: false, amount: 0, denominationBreakdown: null });
  return [modal, setModal];
}

// Change Modal Component
export function ChangeModal({ modal, setModal, onClose }) {
  if (!modal.show) return null;

  const changeAmount = modal.amount || 0;
  
  // Philippine peso denominations (in cents)
  const denominations = [
    { value: 100000, label: '₱1000', type: 'bill' },
    { value: 50000, label: '₱500', type: 'bill' },
    { value: 20000, label: '₱200', type: 'bill' },
    { value: 10000, label: '₱100', type: 'bill' },
    { value: 5000, label: '₱50', type: 'bill' },
    { value: 2000, label: '₱20', type: 'bill' },
    { value: 1000, label: '₱10', type: 'coin' },
    { value: 500, label: '₱5', type: 'coin' },
    { value: 100, label: '₱1', type: 'coin' },
    { value: 25, label: '25¢', type: 'coin' },
    { value: 10, label: '10¢', type: 'coin' },
    { value: 5, label: '5¢', type: 'coin' },
    { value: 1, label: '1¢', type: 'coin' }
  ];

  // Calculate denomination breakdown
  const calculateBreakdown = (amount) => {
    let remaining = Math.round(amount);
    const breakdown = [];
    
    denominations.forEach(denom => {
      const count = Math.floor(remaining / denom.value);
      if (count > 0) {
        breakdown.push({
          ...denom,
          count
        });
        remaining = remaining % denom.value;
      }
    });
    
    return breakdown;
  };

  const breakdown = calculateBreakdown(changeAmount);

  return (
    <div className="modal-overlay fade-in">
      <ModalGlobalStyles />
      <div className="modal-content" style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            backgroundColor: '#4caf50',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '1rem'
          }}>
            <CreditCard size={20} color="white" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>Change Due</h3>
        </div>

        <div style={{
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50', marginBottom: '0.5rem' }}>
            ₱{(changeAmount / 100).toFixed(2)}
          </div>
          <div style={{ color: '#6c757d', fontSize: '1rem' }}>
            Change to give to customer
          </div>
        </div>

        {breakdown.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: '#333' }}>Denomination Breakdown:</h4>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '1rem',
              borderRadius: '8px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {breakdown.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: index < breakdown.length - 1 ? '1px solid #dee2e6' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      backgroundColor: item.type === 'bill' ? '#4caf50' : '#ff9800',
                      borderRadius: '50%',
                      marginRight: '0.5rem'
                    }}></span>
                    <span style={{ fontWeight: '500' }}>{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#6c757d' }}>{item.count} pc{item.count > 1 ? 's' : ''}</span>
                    <span style={{ fontWeight: '600' }}>₱{(item.value * item.count / 100).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => {
              if (onClose) onClose();
              setModal({ show: false, amount: 0, denominationBreakdown: null });
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            Change Given ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for Receipt Modal (Cashier)
export function useReceiptModal() {
  const [modal, setModal] = useState({ show: false, receiptData: null });
  return [modal, setModal];
}

// Receipt Modal Component
export function ReceiptModal({ modal, setModal, onPrint, onClose }) {
  if (!modal.show || !modal.receiptData) return null;

  const receipt = modal.receiptData;
  // Compute values for clean display
  const totalDue = Array.isArray(receipt.items)
    ? receipt.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    : Number(receipt.amount || 0);
  const tendered = Number(typeof receipt.amount === 'number' ? receipt.amount : 0);
  const change = typeof receipt.change === 'number' ? Number(receipt.change) : Math.max(0, tendered - totalDue);
  const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const printReceipt = () => {
    const printWindow = window.open('', '', 'width=300,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receipt.receiptNo}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; margin: 10px; line-height: 1.3; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .double-line { border-top: 2px solid #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; vertical-align: top; }
            .amount { text-align: right; }
            .large { font-size: 14px; }
            .header { font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center header">CHARKOOL RESORT</div>
          <div class="center">Official Receipt</div>
          <div class="center" style="margin-top:4px; font-style: italic;">This is an e-receipt. No signature required.</div>
          <div class="center">123 Beach Road, Paradise City</div>
          <div class="center">Tel: (123) 456-7890</div>
          <div class="line"></div>
          <table>
            <tr><td>Receipt #:</td><td class="amount">${receipt.receiptNo}</td></tr>
            <tr><td>Date/Time:</td><td class="amount">${receipt.timestamp.toLocaleString()}</td></tr>
            <tr><td>Guest:</td><td class="amount">${receipt.guestName}</td></tr>
            <tr><td>Booking ID:</td><td class="amount">${receipt.bookingId}</td></tr>
            <tr><td>Cashier:</td><td class="amount">${receipt.cashier}</td></tr>
          </table>
          <div class="line"></div>
          <div class="bold">ITEMS:</div>
          ${receipt.items.map(item => `
            <table>
              <tr>
                <td style="width: 70%;">${item.description}</td>
                <td class="amount">${peso(item.amount)}</td>
              </tr>
            </table>
          `).join('')}
          <div class="line"></div>
          <table>
            <tr class="bold large"><td>TOTAL DUE:</td><td class="amount">${peso(totalDue)}</td></tr>
            <tr><td>Payment Method:</td><td class="amount">${receipt.paymentMethod}</td></tr>
            <tr><td>Amount Tendered:</td><td class="amount">${peso(tendered)}</td></tr>
            ${Number(change) > 0 ? `<tr><td>Change:</td><td class="amount">${peso(change)}</td></tr>` : ''}
          </table>
          <div class="double-line"></div>
          <div class="center">Thank you for choosing</div>
          <div class="center bold">CHARKOOL RESORT!</div>
          <div class="center">Please come again!</div>
          <div style="margin-top: 20px;"></div>
          <div class="center">This receipt is valid for 30 days</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    if (onPrint) onPrint();
  };

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1600 }}>
      <ModalGlobalStyles />
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        width: '90%',
        maxWidth: '600px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            backgroundColor: '#2196f3',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '1rem'
          }}>
            <Check size={20} color="white" />
          </div>
          <h3 id="receipt-modal-title" style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>Payment Complete</h3>
        </div>

        {/* Receipt Preview */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '2px dashed #dee2e6',
          borderRadius: '8px',
          padding: '1.5rem',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            CHARKOOL RESORT
          </div>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Official Receipt</div>
          <div style={{ textAlign: 'center', marginBottom: '1rem', fontStyle: 'italic' }}>This is an e-receipt. No signature required.</div>
          
          <div style={{ borderTop: '1px dashed #666', margin: '0.5rem 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Receipt #:</span>
            <span>{receipt.receiptNo}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Date/Time:</span>
            <span>{receipt.timestamp.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Guest:</span>
            <span>{receipt.guestName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Booking ID:</span>
            <span>{receipt.bookingId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span>Cashier:</span>
            <span>{receipt.cashier}</span>
          </div>
          
          <div style={{ borderTop: '1px dashed #666', margin: '0.5rem 0' }}></div>
          
          {receipt.items.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>{item.description}</span>
              <span>{peso(item.amount)}</span>
            </div>
          ))}
          
          <div style={{ borderTop: '1px dashed #666', margin: '0.5rem 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem' }}>
            <span>TOTAL DUE:</span>
            <span>{peso(totalDue)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Payment:</span>
            <span>{receipt.paymentMethod}</span>
          </div>
          {Number(change) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Change:</span>
              <span>{peso(change)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <span>Amount Tendered:</span>
            <span>{peso(tendered)}</span>
          </div>
          
          <div style={{ borderTop: '2px solid #666', margin: '0.5rem 0' }}></div>
          
          <div style={{ textAlign: 'center', fontSize: '0.8rem' }}>
            <div>Thank you for choosing</div>
            <div style={{ fontWeight: 'bold' }}>CHARKOOL RESORT!</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={printReceipt}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2196f3',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Printer size={18} color="#fff" /> Print Receipt
            </span>
          </button>
          <button
            onClick={() => {
              if (onClose) onClose();
              setModal({ show: false, receiptData: null });
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Account Linking Modals
// Hook for Account Linking Modals
export function useAccountLinkingModal() {
  const [modal, setModal] = useState({ 
    show: false, 
    type: '', // 'detect', 'otp', 'dataSelection', 'success'
    email: '',
    existingUser: null,
    googleData: null,
    otpSent: false
  });
  return [modal, setModal];
}

// Account Detection Modal - When Google sign-in detects existing account
export function AccountDetectionModal({ modal, setModal, onProceed, onCancel }) {
  if (!modal?.show || modal.type !== 'detect') return null;

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1300 }}>
      <ModalGlobalStyles />
      <div className="modal-content" style={{ 
        background: 'linear-gradient(135deg, #febe52 0%, #f6a623 50%, #e67e22 100%)', 
        padding: 32, 
        borderRadius: 20, 
        width: 450, 
        maxWidth: '95%', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', 
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <button 
          style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            fontSize: 24, 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none', 
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer', 
            color: '#6b4700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} 
          onClick={onCancel}
        >
          ×
        </button>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '50%',
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <Info size={28} color="#6b4700" />
          </div>
          <h2 style={{ margin: 0, color: '#6b4700', fontWeight: 700, fontSize: 22 }}>
            Account Already Exists
          </h2>
        </div>
        
        <div style={{ color: '#6b4700', fontSize: 16, lineHeight: 1.5, textAlign: 'center', marginBottom: 24 }}>
          We found an existing account with <strong>{modal.email}</strong>. 
          <br />
          Would you like to link your Google account to your existing profile?
        </div>
        
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button 
            style={{ 
              flex: 1, 
              background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', 
              color: '#fff', 
              fontWeight: 600, 
              border: 'none', 
              borderRadius: 12, 
              padding: '14px 0', 
              fontSize: 16, 
              cursor: 'pointer', 
              boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
              transition: 'all 0.2s ease'
            }} 
            onClick={onProceed}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Yes, Link Accounts
          </button>
          <button 
            style={{ 
              flex: 1, 
              background: 'rgba(255,255,255,0.3)', 
              color: '#6b4700', 
              fontWeight: 600, 
              border: '2px solid rgba(255,255,255,0.4)', 
              borderRadius: 12, 
              padding: '14px 0', 
              fontSize: 16, 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }} 
            onClick={onCancel}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.5)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.3)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// OTP Verification Modal for Account Linking
export function AccountLinkingOTPModal({ modal, setModal, onVerify, onResendOTP, loading, error }) {
  const [otp, setOtp] = useState('');
  
  if (!modal?.show || modal.type !== 'otp') return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.length === 6) {
      onVerify(otp);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1300 }}>
      <ModalGlobalStyles />
      <div className="modal-content" style={{ 
        background: 'linear-gradient(135deg, #febe52 0%, #f6a623 50%, #e67e22 100%)', 
        padding: 32, 
        borderRadius: 20, 
        width: 420, 
        maxWidth: '95%', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', 
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <button 
          style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            fontSize: 24, 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none', 
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer', 
            color: '#6b4700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} 
          onClick={() => setModal({ show: false })}
        >
          ×
        </button>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '50%',
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <Check size={28} color="#6b4700" />
          </div>
          <h2 style={{ margin: 0, color: '#6b4700', fontWeight: 700, fontSize: 22 }}>
            Verify Your Identity
          </h2>
        </div>
        
        <div style={{ color: '#6b4700', fontSize: 16, lineHeight: 1.5, textAlign: 'center', marginBottom: 24 }}>
          We've sent a 6-digit verification code to <strong>{modal.email}</strong>
          <br />
          Please enter the code to link your accounts.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              value={otp}
              onChange={handleOtpChange}
              placeholder="Enter 6-digit code"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                fontWeight: '600',
                textAlign: 'center',
                letterSpacing: '0.3em',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.9)',
                color: '#6b4700',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              maxLength="6"
              autoComplete="off"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              color: '#c0392b',
              fontSize: '14px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button 
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{ 
                flex: 1, 
                background: otp.length === 6 ? 
                  'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : 
                  'rgba(255,255,255,0.3)', 
                color: otp.length === 6 ? '#fff' : '#6b4700', 
                fontWeight: 600, 
                border: 'none', 
                borderRadius: 12, 
                padding: '14px 0', 
                fontSize: 16, 
                cursor: otp.length === 6 ? 'pointer' : 'not-allowed', 
                boxShadow: otp.length === 6 ? '0 4px 12px rgba(39, 174, 96, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }} 
            >
              {loading ? 'Verifying...' : 'Verify & Link'}
            </button>
            <button 
              type="button"
              onClick={onResendOTP}
              style={{ 
                flex: 1, 
                background: 'rgba(255,255,255,0.3)', 
                color: '#6b4700', 
                fontWeight: 600, 
                border: '2px solid rgba(255,255,255,0.4)', 
                borderRadius: 12, 
                padding: '14px 0', 
                fontSize: 16, 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} 
            >
              Resend Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Data Selection Modal - Choose which data to keep
export function DataSelectionModal({ modal, setModal, onComplete, loading }) {
  const [selectedData, setSelectedData] = useState('existing'); // 'existing' or 'google'
  
  if (!modal?.show || modal.type !== 'dataSelection') return null;

  const handleSubmit = () => {
    onComplete(selectedData);
  };

  const existingUser = modal.existingUser;
  const googleData = modal.googleData;

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1300 }}>
      <ModalGlobalStyles />
      <div className="modal-content" style={{ 
        background: 'linear-gradient(135deg, #febe52 0%, #f6a623 50%, #e67e22 100%)', 
        padding: 32, 
        borderRadius: 20, 
        width: 500, 
        maxWidth: '95%', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', 
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <button 
          style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            fontSize: 24, 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none', 
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer', 
            color: '#6b4700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} 
          onClick={() => setModal({ show: false })}
        >
          ×
        </button>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: '#6b4700', fontWeight: 700, fontSize: 22 }}>
            Choose Profile Data
          </h2>
          <p style={{ color: '#8b5c00', fontSize: 14, margin: '8px 0 0' }}>
            Which profile information would you like to keep?
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {/* Existing Profile Option */}
          <div 
            onClick={() => setSelectedData('existing')}
            style={{
              flex: 1,
              padding: 20,
              background: selectedData === 'existing' ? 
                'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : 
                'rgba(255,255,255,0.3)',
              border: `2px solid ${selectedData === 'existing' ? '#27ae60' : 'rgba(255,255,255,0.4)'}`,
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: selectedData === 'existing' ? '#fff' : '#6b4700'
            }}
          >
            <h4 style={{ margin: '0 0 12px', fontWeight: 600 }}>
              Keep Existing Profile
            </h4>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              <div><strong>Name:</strong> {existingUser?.name}</div>
              <div><strong>Email:</strong> {existingUser?.email}</div>
              <div><strong>Phone:</strong> {existingUser?.contactNumber}</div>
            </div>
          </div>

          {/* Google Profile Option */}
          <div 
            onClick={() => setSelectedData('google')}
            style={{
              flex: 1,
              padding: 20,
              background: selectedData === 'google' ? 
                'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : 
                'rgba(255,255,255,0.3)',
              border: `2px solid ${selectedData === 'google' ? '#27ae60' : 'rgba(255,255,255,0.4)'}`,
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: selectedData === 'google' ? '#fff' : '#6b4700'
            }}
          >
            <h4 style={{ margin: '0 0 12px', fontWeight: 600 }}>
              Use Google Profile
            </h4>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              <div><strong>Name:</strong> {googleData?.name}</div>
              <div><strong>Email:</strong> {googleData?.email}</div>
              <div><strong>Image:</strong> {googleData?.image ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            style={{ 
              flex: 1, 
              background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', 
              color: '#fff', 
              fontWeight: 600, 
              border: 'none', 
              borderRadius: 12, 
              padding: '14px 0', 
              fontSize: 16, 
              cursor: loading ? 'not-allowed' : 'pointer', 
              boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
              transition: 'all 0.2s ease'
            }} 
          >
            {loading ? 'Linking Accounts...' : 'Complete Linking'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Success Modal - Account linking completed
export function AccountLinkingSuccessModal({ modal, setModal, onSignIn }) {
  if (!modal?.show || modal.type !== 'success') return null;

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1300 }}>
      <ModalGlobalStyles />
      <div className="modal-content" style={{ 
        background: 'linear-gradient(135deg, #febe52 0%, #f6a623 50%, #e67e22 100%)', 
        padding: 32, 
        borderRadius: 20, 
        width: 420, 
        maxWidth: '95%', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', 
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <button 
          style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            fontSize: 24, 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none', 
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer', 
            color: '#6b4700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} 
          onClick={() => setModal({ show: false })}
        >
          ×
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '50%',
            width: 80,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <Check size={40} color="#6b4700" />
          </div>
          
          <h2 style={{ margin: '0 0 16px', color: '#6b4700', fontWeight: 700, fontSize: 24 }}>
            Accounts Successfully Linked!
          </h2>
          
          <p style={{ color: '#6b4700', fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>
            Your Google account has been linked to your existing profile. 
            You can now sign in using either method.
          </p>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => onSignIn('google')}
              style={{ 
                flex: 1, 
                background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)', 
                color: '#fff', 
                fontWeight: 600, 
                border: 'none', 
                borderRadius: 12, 
                padding: '14px 0', 
                fontSize: 16, 
                cursor: 'pointer', 
                boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                transition: 'all 0.2s ease'
              }} 
            >
              Sign in with Google
            </button>
            <button 
              onClick={() => onSignIn('credentials')}
              style={{ 
                flex: 1, 
                background: 'rgba(255,255,255,0.3)', 
                color: '#6b4700', 
                fontWeight: 600, 
                border: '2px solid rgba(255,255,255,0.4)', 
                borderRadius: 12, 
                padding: '14px 0', 
                fontSize: 16, 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} 
            >
              Sign in with Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Navigation Confirmation Modal
export function NavigationConfirmationModal({ 
  show, 
  onStay, 
  onLeave, 
  message,
  context = 'default',
  showSessionOption = true 
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Define handlers first
  const handleStay = () => {
    if (dontAskAgain) {
      sessionStorage.setItem('navigationConfirmation_disabled', 'true');
    }
    onStay(dontAskAgain);
  };

  const handleLeave = () => {
    if (dontAskAgain) {
      sessionStorage.setItem('navigationConfirmation_disabled', 'true');
    }
    onLeave(dontAskAgain);
  };

  // Handle ESC key - MUST be at the top before any conditional returns
  useEffect(() => {
    if (!show) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleStay();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, dontAskAgain]);

  if (!show) {
    return null;
  }

  // Context-specific messages
  const getContextMessage = () => {
    if (message) return message;
    
    switch (context) {
      case 'logout':
        return 'Are you sure you want to log out? You will need to sign in again to access your account.';
      case 'booking':
        return 'You have an active booking in progress. Leaving now may lose your selection and require starting over.';
      case 'payment':
        return 'Leaving during payment may cancel your reservation. Your booking will be lost if not completed within 15 minutes.';
      case 'form':
        return 'You have unsaved changes that will be lost. Are you sure you want to leave without saving?';
      case 'admin':
        return 'Unsaved inventory changes will be lost. Please save your work before navigating away.';
      case 'profile':
        return 'Your profile changes have not been saved. Leave without saving?';
      default:
        return 'Are you sure you want to leave this page? Any unsaved progress may be lost.';
    }
  };

  const getContextIcon = () => {
    switch (context) {
      case 'logout':
        return '🚪';
      case 'booking':
      case 'payment':
        return '🏨';
      case 'form':
      case 'admin':
        return '⚠️';
      case 'profile':
        return '👤';
      default:
        return '❓';
    }
  };

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 1500 }}>
      <ModalGlobalStyles />
      <div className="modal-content" style={{ 
        background: 'linear-gradient(135deg, #FEBE52 0%, #E6A83D 20%, #CC9634 100%)', 
        padding: 32, 
        borderRadius: 16, 
        width: 420, 
        maxWidth: '95%', 
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)', 
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)',
        animation: 'slideIn 0.3s ease-out'
      }}>
        
        {/* Icon and Title */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 20,
          gap: 12
        }}>
          <div style={{ 
            fontSize: 28,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}>
            {getContextIcon()}
          </div>
          <h2 style={{ 
            margin: 0, 
            color: '#6B4700', 
            fontWeight: 700,
            fontSize: 20,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            Confirm Navigation
          </h2>
        </div>

        {/* Message */}
        <div style={{ 
          margin: '0 0 24px 0', 
          color: '#8B5A00', 
          fontWeight: 500,
          fontSize: 15,
          lineHeight: 1.5,
          textShadow: '0 1px 1px rgba(0,0,0,0.05)'
        }}>
          {getContextMessage()}
        </div>

        {/* Session Option Checkbox */}
        {showSessionOption && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 24,
            gap: 8,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <input
              type="checkbox"
              id="dontAskAgain"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                accentColor: '#6B4700'
              }}
            />
            <label 
              htmlFor="dontAskAgain" 
              style={{ 
                color: '#6B4700', 
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              Don't ask again this session
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          marginTop: 8
        }}>
          <button 
            onClick={handleStay}
            style={{ 
              flex: 1, 
              background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)', 
              color: '#fff', 
              fontWeight: 600, 
              border: 'none', 
              borderRadius: 10, 
              padding: '14px 0', 
              fontSize: 15, 
              cursor: 'pointer', 
              boxShadow: '0 4px 12px rgba(76,175,80,0.3)',
              transition: 'all 0.2s ease',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 16px rgba(76,175,80,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(76,175,80,0.3)';
            }}
          >
            {context === 'logout' ? 'Stay Logged In' : 'Stay & Continue'}
          </button>
          <button 
            onClick={handleLeave}
            style={{ 
              flex: 1, 
              background: 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)', 
              color: '#fff', 
              fontWeight: 600, 
              border: 'none', 
              borderRadius: 10, 
              padding: '14px 0', 
              fontSize: 15, 
              cursor: 'pointer', 
              boxShadow: '0 4px 12px rgba(244,67,54,0.3)',
              transition: 'all 0.2s ease',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 16px rgba(244,67,54,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(244,67,54,0.3)';
            }}
          >
            {context === 'logout' ? 'Yes, Log Out' : 'Leave Anyway'}
          </button>
        </div>

        {/* Additional CSS for animation */}
        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.9) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}