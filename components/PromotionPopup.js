'use client';
import { useState, useEffect } from 'react';

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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '10px', maxWidth: '500px', textAlign: 'center' }}>
        <h2>{currentPromotion.title}</h2>
        {currentPromotion.image && <img src={currentPromotion.image} alt={currentPromotion.title} style={{ maxWidth: '100%', marginBottom: '10px' }} />}
        <p>{currentPromotion.description}</p>
        <p>Discount: {currentPromotion.discountType === 'percentage' ? `${currentPromotion.discountValue / 100}%` : `₱${currentPromotion.discountValue / 100}`}</p>
        <button onClick={closePopup} style={{ padding: '10px 20px', background: '#FEBE52', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  );
}
