'use client';
import React, { useState } from 'react';
import { Bell, X, Check, AlertCircle, Info, CalendarCheck2, CreditCard } from 'lucide-react';

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
                <td class="amount">₱${item.amount.toFixed(2)}</td>
              </tr>
            </table>
          `).join('')}
          <div class="line"></div>
          <table>
            <tr class="bold large"><td>TOTAL:</td><td class="amount">₱${receipt.amount.toFixed(2)}</td></tr>
            <tr><td>Payment Method:</td><td class="amount">${receipt.paymentMethod}</td></tr>
            <tr><td>Amount Tendered:</td><td class="amount">₱${receipt.amount.toFixed(2)}</td></tr>
            ${receipt.change > 0 ? `<tr><td>Change:</td><td class="amount">₱${receipt.change.toFixed(2)}</td></tr>` : ''}
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
    <div className="modal-overlay fade-in">
      <ModalGlobalStyles />
      <div className="modal-content" style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        width: '90%',
        maxWidth: '600px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
        overflowY: 'auto'
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
          <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>Payment Complete</h3>
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
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>Official Receipt</div>
          
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
              <span>₱{item.amount.toFixed(2)}</span>
            </div>
          ))}
          
          <div style={{ borderTop: '1px dashed #666', margin: '0.5rem 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem' }}>
            <span>TOTAL:</span>
            <span>₱{receipt.amount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Payment:</span>
            <span>{receipt.paymentMethod}</span>
          </div>
          {receipt.change > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Change:</span>
              <span>₱{receipt.change.toFixed(2)}</span>
            </div>
          )}
          
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
            🖨️ Print Receipt
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