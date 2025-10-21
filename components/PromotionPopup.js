'use client';
import { useState, useEffect } from 'react';
import { X, Tag, Calendar, Percent, Sparkles } from 'lucide-react';

export default function PromotionPopup({ promotions }) {
  const [currentPromotion, setCurrentPromotion] = useState(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Check if popup has been shown in this session
    const hasShown = sessionStorage.getItem('promotionPopupShown');
    if (!hasShown && promotions.length > 0) {
      // Find active promotion
      const now = new Date();
      const activePromo = promotions.find(p => p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now);
      if (activePromo) {
        setCurrentPromotion(activePromo);
      }
    }
  }, [promotions]);

  const closePopup = () => {
    setShown(true);
    sessionStorage.setItem('promotionPopupShown', 'true');
    setCurrentPromotion(null);
  };

  if (!currentPromotion || shown) return null;

  const discountDisplay = currentPromotion.discountType === 'percentage' 
    ? `${currentPromotion.discountValue / 100}%` 
    : `₱${(currentPromotion.discountValue / 100).toLocaleString()}`;

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      background: 'rgba(0, 0, 0, 0.8)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 2000,
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      <div style={{ 
        background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
        borderRadius: '20px', 
        maxWidth: '90%',
        width: '500px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'slideUp 0.4s ease-out',
        position: 'relative'
      }}>
        {/* Decorative Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          opacity: 0.1,
          borderRadius: '20px 20px 0 0'
        }} />
        
        {/* Close Button */}
        <button
          onClick={closePopup}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(0, 0, 0, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.2)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0, 0, 0, 0.1)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          <X size={20} color="#374151" />
        </button>

        {/* Header */}
        <div style={{
          padding: '2rem 2rem 1rem 2rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1rem',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}>
            <Sparkles size={16} />
            SPECIAL OFFER
          </div>
          
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 1rem 0',
            lineHeight: '1.3',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {currentPromotion.title}
          </h2>
        </div>

        {/* Image */}
        {currentPromotion.image && (
          <div style={{
            padding: '0 2rem',
            marginBottom: '1.5rem'
          }}>
            <img 
              src={currentPromotion.image} 
              alt={currentPromotion.title}
              style={{
                width: '100%',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
              }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '0 2rem 2rem 2rem' }}>
          {/* Description */}
          {currentPromotion.description && (
            <p style={{
              fontSize: '1.1rem',
              color: '#6b7280',
              lineHeight: '1.6',
              margin: '0 0 1.5rem 0',
              textAlign: 'center'
            }}>
              {currentPromotion.description}
            </p>
          )}

          {/* Discount Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            border: '2px solid #f59e0b',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: '#f59e0b',
              borderRadius: '50%',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {currentPromotion.discountType === 'percentage' ? 
                <Percent size={20} color="white" /> : 
                <span style={{fontSize: '20px', color: 'white', fontWeight: 'bold'}}>₱</span>
              }
            </div>
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#92400e',
                marginBottom: '0.25rem'
              }}>
                YOUR DISCOUNT
              </div>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: '#92400e'
              }}>
                {discountDisplay} OFF
              </div>
            </div>
          </div>

          {/* Validity */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: '#6b7280',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            <Calendar size={16} />
            Valid until {new Date(currentPromotion.endDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          {/* Action Button */}
          <button 
            onClick={closePopup}
            style={{
              width: '100%',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'white',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
            }}
          >
            <Tag size={20} />
            Claim This Offer
          </button>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          div[style*="width: 500px"] {
            width: 95% !important;
          }
          
          h2 {
            font-size: 1.5rem !important;
          }
          
          div[style*="padding: 2rem"] {
            padding: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
